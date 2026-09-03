from rest_framework import status, permissions, generics, parsers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import make_password
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Count, Q
from django.utils.text import slugify
from django.core.mail import send_mail
from django.conf import settings
import datetime
import logging
import smtplib
import socket
from itertools import combinations

from .models import (
    Profile, Post, Comment, Notification, Message, Follow,
    RecruitmentPost, Application, ClubMember, Tournament, Match,
    SponsorshipOpportunity, SponsorshipApplication,
    ResumeExperience, ResumeAchievement, ResumeCertificate, ResumeStatistic,
    Endorsement, Recommendation, ContactMessage, Blog, Story, StoryView,
    DeviceToken, PendingRegistration
)
from .serializers import (
    UserSerializer, UserSummarySerializer, ProfileSerializer,
    PostSerializer, CommentSerializer, NotificationSerializer,
    MessageSerializer, ConversationSerializer, FollowSerializer,
    RecruitmentPostSerializer, ApplicationSerializer, ClubMemberSerializer,
    TournamentSerializer, MatchSerializer,
    SponsorshipOpportunitySerializer, SponsorshipApplicationSerializer,
    ResumeExperienceSerializer, ResumeAchievementSerializer,
    ResumeCertificateSerializer, ResumeStatisticSerializer,
    EndorsementSerializer, RecommendationSerializer,
    BlogSerializer, ContactMessageSerializer, AdminUserUpdateSerializer,
    StorySerializer, StoryViewSerializer, StoryTrayGroupSerializer,
    DeviceTokenSerializer,
    RegisterRequestOTPSerializer, RegisterVerifyOTPSerializer, RegisterResendOTPSerializer
)
from django.utils import timezone

User = get_user_model()
logger = logging.getLogger(__name__)


# ==========================================
# AUTHENTICATION APIS
# ==========================================

def send_registration_otp_email(email: str, otp: str, username: str):
    """Sends a 6-digit registration verification OTP via Django send_mail()."""
    subject = "Your SportsSphere Verification Code"
    message = (
        f"Hello {username},\n\n"
        f"Your verification code for SportsSphere is: {otp}\n\n"
        f"This code will expire in 10 minutes. If you did not request this code, please ignore this email.\n\n"
        f"Best regards,\n"
        f"The SportsSphere Team"
    )
    from_email = settings.DEFAULT_FROM_EMAIL or getattr(settings, 'EMAIL_HOST_USER', None) or 'SportsSphere <noreply@sportssphere.com>'
    send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=[email],
        fail_silently=False,
    )


class RegisterRequestOTPView(APIView):
    """
    POST /api/auth/register/request-otp/
    Validates registration data, creates/updates PendingRegistration, and sends 6-digit OTP email.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterRequestOTPSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))
            error_msg = first_error[0] if isinstance(first_error, list) else str(first_error)
            return Response({'error': error_msg, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data['username']
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        role = serializer.validated_data['role']

        # Check existing active pending registration for cooldown
        pending = PendingRegistration.objects.filter(email__iexact=email).first()
        if pending and not pending.is_expired():
            cooldown_left = pending.cooldown_seconds_remaining()
            if cooldown_left > 0:
                return Response({
                    'error': f'Please wait {cooldown_left} seconds before requesting a new OTP.',
                    'cooldown_remaining': cooldown_left
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Clean up expired pending records
        PendingRegistration.objects.filter(expires_at__lt=timezone.now()).delete()

        # Generate cryptographically secure OTP & hash it
        raw_otp = PendingRegistration.generate_otp()
        hashed_otp = make_password(raw_otp)
        hashed_password = make_password(password)

        now = timezone.now()
        expires_at = now + datetime.timedelta(minutes=10)

        # Store or update pending registration
        PendingRegistration.objects.update_or_create(
            email=email,
            defaults={
                'username': username,
                'password': hashed_password,
                'role': role,
                'otp_hash': hashed_otp,
                'attempts': 0,
                'expires_at': expires_at,
                'last_sent_at': now,
            }
        )

        try:
            send_registration_otp_email(email=email, otp=raw_otp, username=username)
        except smtplib.SMTPAuthenticationError as e:
            logger.exception("SMTP Authentication error when sending OTP to %s: %s", email, e)
            return Response({
                'error': 'Email delivery failed due to mail server authentication error. Please contact the administrator.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except (socket.timeout, TimeoutError) as e:
            logger.exception("SMTP timeout when sending OTP to %s: %s", email, e)
            return Response({
                'error': 'Email delivery timed out while contacting mail server. Please try again shortly.'
            }, status=status.HTTP_504_GATEWAY_TIMEOUT)
        except smtplib.SMTPException as e:
            logger.exception("SMTP delivery error when sending OTP to %s: %s", email, e)
            return Response({
                'error': 'Failed to send verification email due to a mail delivery error. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.exception("Unexpected error sending registration OTP email to %s: %s", email, e)
            return Response({
                'error': 'Failed to send verification email. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': 'Verification code sent to your email.',
            'email': email,
            'expires_in': 600
        }, status=status.HTTP_200_OK)


class RegisterVerifyOTPView(APIView):
    """
    POST /api/auth/register/verify-otp/
    Verifies 6-digit OTP, creates User and Token within atomic transaction upon success.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterVerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))
            error_msg = first_error[0] if isinstance(first_error, list) else str(first_error)
            return Response({'error': error_msg, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']

        with transaction.atomic():
            pending = PendingRegistration.objects.select_for_update().filter(email__iexact=email).first()

            if not pending:
                return Response({'error': 'No pending registration found for this email. Please request a new OTP.'}, status=status.HTTP_404_NOT_FOUND)

            if pending.is_expired():
                pending.delete()
                return Response({'error': 'OTP has expired. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)

            if pending.is_exhausted():
                pending.delete()
                return Response({'error': 'Maximum verification attempts exceeded. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)

            if not pending.check_otp(otp):
                pending.attempts += 1
                if pending.attempts >= 5:
                    pending.delete()
                    return Response({'error': 'Maximum verification attempts exceeded. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    pending.save(update_fields=['attempts'])
                    remaining_attempts = 5 - pending.attempts
                    return Response({
                        'error': f'Invalid verification code. {remaining_attempts} attempt{"s" if remaining_attempts != 1 else ""} remaining.',
                        'remaining_attempts': remaining_attempts
                    }, status=status.HTTP_400_BAD_REQUEST)

            # OTP is valid! Check race condition for existing user
            if User.objects.filter(email__iexact=pending.email).exists():
                pending.delete()
                return Response({'error': 'A user with that email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

            if User.objects.filter(username__iexact=pending.username).exists():
                pending.delete()
                return Response({'error': 'A user with that username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

            # Create User model instance with pre-hashed password
            user = User(
                username=pending.username,
                email=pending.email,
                role=pending.role,
                password=pending.password,
                is_verified=True,
            )
            user.save()

            # DRF token
            token, _ = Token.objects.get_or_create(user=user)

            # Delete pending registration record
            pending.delete()

            user_data = UserSerializer(user, context={'request': request}).data

            return Response({
                'token': token.key,
                'user': user_data,
                'message': f"Welcome to SportsSphere, {user.username}!"
            }, status=status.HTTP_201_CREATED)


class RegisterResendOTPView(APIView):
    """
    POST /api/auth/register/resend-otp/
    Resends a new 6-digit OTP for an active pending registration subject to 60s cooldown.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterResendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))
            error_msg = first_error[0] if isinstance(first_error, list) else str(first_error)
            return Response({'error': error_msg, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']

        pending = PendingRegistration.objects.filter(email__iexact=email).first()
        if not pending:
            return Response({'error': 'No pending registration found for this email. Please start registration again.'}, status=status.HTTP_404_NOT_FOUND)

        if pending.is_expired():
            pending.delete()
            return Response({'error': 'Registration session expired. Please start registration again.'}, status=status.HTTP_400_BAD_REQUEST)

        cooldown_left = pending.cooldown_seconds_remaining()
        if cooldown_left > 0:
            return Response({
                'error': f'Please wait {cooldown_left} seconds before requesting a new OTP.',
                'cooldown_remaining': cooldown_left
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Generate new OTP, replace hash, reset attempts, reset 10m expiry, update last_sent_at
        raw_otp = PendingRegistration.generate_otp()
        pending.set_otp(raw_otp)
        pending.save(update_fields=['otp_hash', 'attempts', 'expires_at', 'last_sent_at'])

        try:
            send_registration_otp_email(email=pending.email, otp=raw_otp, username=pending.username)
        except smtplib.SMTPAuthenticationError as e:
            logger.exception("SMTP Authentication error when resending OTP to %s: %s", pending.email, e)
            return Response({
                'error': 'Email delivery failed due to mail server authentication error. Please contact the administrator.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except (socket.timeout, TimeoutError) as e:
            logger.exception("SMTP timeout when resending OTP to %s: %s", pending.email, e)
            return Response({
                'error': 'Email delivery timed out while contacting mail server. Please try again shortly.'
            }, status=status.HTTP_504_GATEWAY_TIMEOUT)
        except smtplib.SMTPException as e:
            logger.exception("SMTP delivery error when resending OTP to %s: %s", pending.email, e)
            return Response({
                'error': 'Failed to send verification email due to a mail delivery error. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.exception("Unexpected error resending registration OTP email to %s: %s", pending.email, e)
            return Response({
                'error': 'Failed to send verification email. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': 'A new verification code has been sent to your email.',
            'email': pending.email,
            'expires_in': 600
        }, status=status.HTTP_200_OK)


class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '').strip()
        role = request.data.get('role', User.Role.PLAYER)

        if not username or not password or not email:
            return Response({'error': 'Username, email, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username__iexact=username).exists():
            return Response({'error': 'A user with that username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': 'A user with that email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_roles = [r[0] for r in User.Role.choices]
        if role not in valid_roles:
            role = User.Role.PLAYER

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role=role
        )
        token, _ = Token.objects.get_or_create(user=user)
        user_data = UserSerializer(user, context={'request': request}).data

        return Response({
            'token': token.key,
            'user': user_data,
            'message': f"Welcome to SportsSphere, {user.username}!"
        }, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response({'error': 'Please provide both username and password.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if not user:
            # Check if username was actually an email
            user_obj = User.objects.filter(email__iexact=username).first()
            if user_obj:
                user = authenticate(username=user_obj.username, password=password)

        if not user:
            return Response({'error': 'Invalid credentials. Please try again.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'error': 'This account has been deactivated.'}, status=status.HTTP_403_FORBIDDEN)

        token, _ = Token.objects.get_or_create(user=user)
        user_data = UserSerializer(user, context={'request': request}).data

        return Response({
            'token': token.key,
            'user': user_data,
            'message': f"Welcome back, {user.username}!"
        })


class LogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        fcm_token = request.data.get('token') or request.data.get('fcm_token')
        if fcm_token and isinstance(fcm_token, str) and fcm_token.strip():
            DeviceToken.objects.filter(token=fcm_token.strip(), user=request.user).delete()
            logger.info("Device token removed on logout for user %s", request.user.username)
        Token.objects.filter(user=request.user).delete()
        return Response({'message': 'Logged out successfully.'})


class CurrentUserAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        unread_notifications_count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        unread_messages_count = Message.objects.filter(receiver=request.user, is_read=False).count()
        return Response({
            'user': serializer.data,
            'unread_notifications_count': unread_notifications_count,
            'unread_messages_count': unread_messages_count
        })


class GoogleAuthAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        id_token_str = request.data.get('id_token') or request.data.get('token')
        role = request.data.get('role', User.Role.PLAYER)

        if not id_token_str or not isinstance(id_token_str, str):
            return Response({'error': 'Google ID token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        id_token_str = id_token_str.strip()
        payload = None

        # 1. Attempt verification via Google Auth library
        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests
            payload = google_id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request()
            )
        except Exception as g_err:
            logger.debug("google.oauth2 verification failed, trying firebase_admin: %s", g_err)
            # 2. Fallback attempt verification via Firebase Admin SDK
            try:
                from .firebase import get_firebase_app
                from firebase_admin import auth as firebase_auth
                app = get_firebase_app()
                if app:
                    payload = firebase_auth.verify_id_token(id_token_str)
                else:
                    logger.warning("Firebase Admin app not available for token verification.")
            except Exception as fb_err:
                logger.warning("Firebase ID token verification failed: %s", fb_err)

        if not payload:
            return Response({'error': 'Invalid or expired Google token. Please try again.'}, status=status.HTTP_401_UNAUTHORIZED)

        email = payload.get('email')
        if not email:
            return Response({'error': 'Google account did not provide an email address.'}, status=status.HTTP_400_BAD_REQUEST)

        email_verified = payload.get('email_verified', True)
        if not email_verified:
            return Response({'error': 'Your Google email address is not verified.'}, status=status.HTTP_400_BAD_REQUEST)

        email = email.lower().strip()
        first_name = payload.get('given_name') or (payload.get('name', '').split(' ')[0] if payload.get('name') else '')
        name_parts = payload.get('name', '').split(' ') if payload.get('name') else []
        last_name = payload.get('family_name') or (' '.join(name_parts[1:]) if len(name_parts) > 1 else '')

        # Check if user already exists
        user = User.objects.filter(email__iexact=email).first()
        is_new_user = False

        if user:
            if not user.is_active:
                return Response({'error': 'This account has been deactivated.'}, status=status.HTTP_403_FORBIDDEN)
            # Update names if empty
            if not user.first_name and first_name:
                user.first_name = first_name
            if not user.last_name and last_name:
                user.last_name = last_name
            user.save()
        else:
            is_new_user = True
            # Validate role
            valid_roles = [r[0] for r in User.Role.choices]
            if role not in valid_roles:
                role = User.Role.PLAYER

            # Generate unique username
            base_username = (
                payload.get('name') or email.split('@')[0]
            ).strip().lower()
            clean_username = slugify(base_username).replace('-', '_')
            if not clean_username:
                clean_username = email.split('@')[0].replace('.', '_')

            candidate_username = clean_username
            counter = 1
            while User.objects.filter(username__iexact=candidate_username).exists():
                candidate_username = f"{clean_username}_{counter}"
                counter += 1

            user = User.objects.create_user(
                username=candidate_username,
                email=email,
                role=role,
                first_name=first_name,
                last_name=last_name
            )
            user.set_unusable_password()
            user.save()

        token, _ = Token.objects.get_or_create(user=user)
        user_data = UserSerializer(user, context={'request': request}).data

        return Response({
            'token': token.key,
            'user': user_data,
            'is_new_user': is_new_user,
            'message': f"Welcome to SportsSphere, {user.username}!" if is_new_user else f"Welcome back, {user.username}!"
        }, status=status.HTTP_201_CREATED if is_new_user else status.HTTP_200_OK)


class PasswordResetAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': f"A password reset link has been sent to {email}. (Simulated)"})


class DeviceTokenAPIView(APIView):
    """
    API endpoint for managing Capacitor FCM device tokens.
    POST: Register or update an FCM device token for the authenticated user.
    DELETE: Deregister/remove an FCM device token for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token_str = request.data.get('token')
        if not token_str or not isinstance(token_str, str) or not token_str.strip():
            return Response({'error': 'Device token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        token_str = token_str.strip()

        # If the same token already exists, update/reuse it rather than creating duplicates.
        # This also cleanly handles phone handover: reassociating the token with the newly authenticated user.
        device_token, created = DeviceToken.objects.update_or_create(
            token=token_str,
            defaults={'user': request.user}
        )
        logger.info("Device token %s for user %s", "registered" if created else "updated", request.user.username)

        return Response({
            'message': 'Device token registered successfully.',
            'id': device_token.id,
            'created': created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request):
        token_str = request.data.get('token') or request.query_params.get('token')
        if not token_str or not isinstance(token_str, str) or not token_str.strip():
            return Response({'error': 'Device token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        token_str = token_str.strip()
        deleted_count, _ = DeviceToken.objects.filter(token=token_str, user=request.user).delete()
        logger.info("Deregistered device token for user %s (count: %d)", request.user.username, deleted_count)

        return Response({
            'message': 'Device token unregistered successfully.',
            'deleted': deleted_count > 0,
        }, status=status.HTTP_200_OK)



# ==========================================
# PROFILES & USERS APIS
# ==========================================

class UserProfileDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, username):
        user_obj = get_object_or_404(User.objects.select_related('profile'), username__iexact=username)
        user_data = UserSerializer(user_obj, context={'request': request}).data
        
        # Portfolio data for Player
        portfolio = {}
        if user_obj.role == User.Role.PLAYER:
            portfolio['experiences'] = ResumeExperienceSerializer(
                ResumeExperience.objects.filter(player=user_obj), many=True
            ).data
            portfolio['achievements'] = ResumeAchievementSerializer(
                ResumeAchievement.objects.filter(player=user_obj), many=True
            ).data
            portfolio['certificates'] = ResumeCertificateSerializer(
                ResumeCertificate.objects.filter(player=user_obj), many=True
            ).data
            portfolio['statistics'] = ResumeStatisticSerializer(
                ResumeStatistic.objects.filter(player=user_obj), many=True
            ).data
            portfolio['recommendations'] = RecommendationSerializer(
                Recommendation.objects.filter(player=user_obj).select_related('author', 'author__profile'),
                many=True,
                context={'request': request}
            ).data

            # Endorsements counts by category
            categories = ['LEADERSHIP', 'TEAMWORK', 'FITNESS', 'SKILLS']
            endorsements_counts = {}
            for cat in categories:
                endorsements_counts[cat] = Endorsement.objects.filter(player=user_obj, category=cat).count()
            portfolio['endorsements_counts'] = endorsements_counts

            user_endorsements = []
            if request.user.is_authenticated and request.user.role == User.Role.COACH:
                user_endorsements = list(Endorsement.objects.filter(
                    player=user_obj, coach=request.user
                ).values_list('category', flat=True))
            portfolio['user_endorsements'] = user_endorsements

        return Response({
            'user': user_data,
            'portfolio': portfolio
        })


class ProfileUpdateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def patch(self, request):
        profile = request.user.profile
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Allow updating user first_name and last_name if passed
            first_name = request.data.get('first_name')
            last_name = request.data.get('last_name')
            user_updated = False
            if first_name is not None:
                request.user.first_name = first_name
                user_updated = True
            if last_name is not None:
                request.user.last_name = last_name
                user_updated = True
            if user_updated:
                request.user.save()

            full_user = UserSerializer(request.user, context={'request': request}).data
            return Response({
                'message': 'Profile updated successfully!',
                'user': full_user
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ToggleVerificationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.is_verified = not request.user.is_verified
        request.user.save()
        status_str = "verified" if request.user.is_verified else "unverified"
        return Response({
            'is_verified': request.user.is_verified,
            'message': f"Your profile is now {status_str}."
        })


class ResumeItemAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, item_type):
        if request.user.role != User.Role.PLAYER:
            return Response({'error': 'Only players can manage their sports resume.'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        if item_type == 'experience':
            serializer = ResumeExperienceSerializer(data=data)
        elif item_type == 'achievement':
            serializer = ResumeAchievementSerializer(data=data)
        elif item_type == 'certificate':
            serializer = ResumeCertificateSerializer(data=data)
        elif item_type == 'statistic':
            serializer = ResumeStatisticSerializer(data=data)
        else:
            return Response({'error': 'Invalid resume item type.'}, status=status.HTTP_400_BAD_REQUEST)

        if serializer.is_valid():
            serializer.save(player=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, item_type, item_id):
        if request.user.role != User.Role.PLAYER:
            return Response({'error': 'Only players can manage their sports resume.'}, status=status.HTTP_403_FORBIDDEN)

        if item_type == 'experience':
            item = get_object_or_404(ResumeExperience, id=item_id, player=request.user)
        elif item_type == 'achievement':
            item = get_object_or_404(ResumeAchievement, id=item_id, player=request.user)
        elif item_type == 'certificate':
            item = get_object_or_404(ResumeCertificate, id=item_id, player=request.user)
        elif item_type == 'statistic':
            item = get_object_or_404(ResumeStatistic, id=item_id, player=request.user)
        else:
            return Response({'error': 'Invalid resume item type.'}, status=status.HTTP_400_BAD_REQUEST)

        item.delete()
        return Response({'message': f"Successfully removed {item_type} from sports resume."})


class ToggleEndorsementAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, player_id, category):
        if request.user.role != User.Role.COACH:
            return Response({'error': 'Only coaches can endorse players.'}, status=status.HTTP_403_FORBIDDEN)

        player = get_object_or_404(User, id=player_id, role=User.Role.PLAYER)
        cat_upper = category.upper()
        valid_cats = [c[0] for c in Endorsement.Category.choices]
        if cat_upper not in valid_cats:
            return Response({'error': 'Invalid endorsement category.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = Endorsement.objects.filter(player=player, coach=request.user, category=cat_upper)
        if existing.exists():
            existing.delete()
            endorsed = False
            msg = f"Removed endorsement for {cat_upper.lower()} from {player.username}."
        else:
            Endorsement.objects.create(player=player, coach=request.user, category=cat_upper)
            endorsed = True
            msg = f"Endorsed {player.username} for {cat_upper.lower()}!"
            Notification.objects.create(
                recipient=player,
                sender=request.user,
                notification_type=Notification.NotificationType.SYSTEM,
                content_preview=f"Coach {request.user.username} endorsed you for {cat_upper.lower()}."
            )

        count = Endorsement.objects.filter(player=player, category=cat_upper).count()
        return Response({
            'endorsed': endorsed,
            'category': cat_upper,
            'count': count,
            'message': msg
        })


class AddRecommendationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, player_id):
        if request.user.role not in [User.Role.COACH, User.Role.CLUB]:
            return Response({'error': 'Only coaches and clubs can write recommendations.'}, status=status.HTTP_403_FORBIDDEN)

        player = get_object_or_404(User, id=player_id, role=User.Role.PLAYER)
        relationship = request.data.get('relationship', '').strip()
        content = request.data.get('content', '').strip()

        if not relationship or not content:
            return Response({'error': 'Relationship and recommendation content are required.'}, status=status.HTTP_400_BAD_REQUEST)

        rec = Recommendation.objects.create(
            player=player,
            author=request.user,
            relationship=relationship,
            content=content
        )
        Notification.objects.create(
            recipient=player,
            sender=request.user,
            notification_type=Notification.NotificationType.SYSTEM,
            content_preview=f"{request.user.username} ({request.user.role}) wrote a recommendation for you."
        )

        return Response(
            RecommendationSerializer(rec, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


# ==========================================
# FOLLOW SYSTEM APIS
# ==========================================

class FollowToggleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        user_to_follow = get_object_or_404(User, id=user_id)
        if user_to_follow == request.user:
            return Response({'error': 'You cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        follow_qs = Follow.objects.filter(follower=request.user, following=user_to_follow)
        if follow_qs.exists():
            follow_qs.delete()
            followed = False
            msg = f"You have unfollowed {user_to_follow.username}."
        else:
            Follow.objects.create(follower=request.user, following=user_to_follow)
            followed = True
            msg = f"You are now following {user_to_follow.username}."
            Notification.objects.create(
                recipient=user_to_follow,
                sender=request.user,
                notification_type=Notification.NotificationType.FOLLOW
            )

        followers_count = Follow.objects.filter(following=user_to_follow).count()
        following_count = Follow.objects.filter(follower=user_to_follow).count()

        return Response({
            'followed': followed,
            'followers_count': followers_count,
            'following_count': following_count,
            'message': msg
        })


class FollowersListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, username):
        profile_user = get_object_or_404(User, username=username)
        follows = Follow.objects.filter(following=profile_user).select_related('follower', 'follower__profile')
        followers = [f.follower for f in follows]
        serializer = UserSummarySerializer(followers, many=True, context={'request': request})
        return Response({
            'profile_user': UserSummarySerializer(profile_user, context={'request': request}).data,
            'users': serializer.data
        })


class FollowingListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, username):
        profile_user = get_object_or_404(User, username=username)
        follows = Follow.objects.filter(follower=profile_user).select_related('following', 'following__profile')
        following = [f.following for f in follows]
        serializer = UserSummarySerializer(following, many=True, context={'request': request})
        return Response({
            'profile_user': UserSummarySerializer(profile_user, context={'request': request}).data,
            'users': serializer.data
        })


# ==========================================
# FEED & POSTS APIS
# ==========================================

class PostListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get(self, request):
        author_username = request.query_params.get('author')
        saved = request.query_params.get('saved')

        posts = Post.objects.all().select_related('author', 'author__profile').prefetch_related(
            'likes', 'saved_by', 'comments', 'comments__author', 'comments__author__profile'
        )

        if author_username:
            posts = posts.filter(author__username__iexact=author_username)
        elif saved and request.user.is_authenticated:
            posts = posts.filter(saved_by=request.user)
        elif request.user.is_authenticated:
            # Feed excludes own posts so user only sees their own posts on their profile page
            posts = posts.exclude(author=request.user)

        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        content = request.data.get('content', '')
        image = request.FILES.get('image')
        video = request.FILES.get('video')

        if not content and not image and not video:
            return Response({'error': 'Please provide content, an image, or a video.'}, status=status.HTTP_400_BAD_REQUEST)

        post = Post.objects.create(
            author=request.user,
            content=content,
            image=image,
            video=video
        )
        serializer = PostSerializer(post, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PostDetailUpdateDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get(self, request, post_id):
        post = get_object_or_404(Post, id=post_id)
        serializer = PostSerializer(post, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, post_id):
        post = get_object_or_404(Post, id=post_id)
        if post.author != request.user and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if 'content' in request.data:
            post.content = request.data['content']
        if 'image' in request.FILES:
            post.image = request.FILES['image']
        if 'video' in request.FILES:
            post.video = request.FILES['video']
        post.save()

        serializer = PostSerializer(post, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, post_id):
        post = get_object_or_404(Post, id=post_id)
        if post.author != request.user and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        post.delete()
        return Response({'message': 'Post deleted successfully.'})


class PostLikeToggleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        post = get_object_or_404(Post, id=post_id)
        liked = False
        if post.likes.filter(id=request.user.id).exists():
            post.likes.remove(request.user)
        else:
            post.likes.add(request.user)
            liked = True
            if post.author != request.user:
                Notification.objects.create(
                    recipient=post.author,
                    sender=request.user,
                    notification_type=Notification.NotificationType.LIKE,
                    post=post
                )
        return Response({
            'liked': liked,
            'likes_count': post.likes.count()
        })


class PostSaveToggleAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        post = get_object_or_404(Post, id=post_id)
        saved = False
        if post.saved_by.filter(id=request.user.id).exists():
            post.saved_by.remove(request.user)
        else:
            post.saved_by.add(request.user)
            saved = True
        return Response({
            'saved': saved
        })


class CommentListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, post_id):
        post = get_object_or_404(Post, id=post_id)
        comments = post.comments.all().select_related('author', 'author__profile')
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, post_id):
        post = get_object_or_404(Post, id=post_id)
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Comment content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        comment = Comment.objects.create(
            post=post,
            author=request.user,
            content=content
        )
        if post.author != request.user:
            Notification.objects.create(
                recipient=post.author,
                sender=request.user,
                notification_type=Notification.NotificationType.COMMENT,
                post=post
            )

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CommentDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, comment_id):
        comment = get_object_or_404(Comment, id=comment_id)
        if comment.author != request.user and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        comment.delete()
        return Response({'message': 'Comment deleted successfully.'})


class FeedSidebarWidgetsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        suggested_profiles = []
        if request.user.is_authenticated:
            user_sport = request.user.profile.sport or ''
            all_other = User.objects.exclude(id=request.user.id).exclude(followers=request.user).select_related('profile')
            scored = []
            for u in all_other:
                score = 0
                if user_sport and u.profile.sport and u.profile.sport.lower() == user_sport.lower():
                    score += 10
                score += min(u.followers.count(), 10)
                if u.posts.count() > 0:
                    score += 5
                scored.append((score, u))
            scored.sort(key=lambda x: x[0], reverse=True)
            suggested_profiles = [item[1] for item in scored[:4]]
        else:
            suggested_profiles = User.objects.all().select_related('profile')[:4]

        trending = User.objects.filter(role=User.Role.PLAYER).annotate(
            total_likes=Count('posts__likes')
        ).order_by('-total_likes').select_related('profile')[:4]

        upcoming_events = [
            {'title': 'National Scouting Combine', 'date': 'June 25, 2026', 'location': 'Chicago, IL', 'category': 'Recruitment'},
            {'title': 'SportsSphere Virtual Summit', 'date': 'July 02, 2026', 'location': 'Online', 'category': 'Networking'},
            {'title': 'Elite Club Championship', 'date': 'July 15, 2026', 'location': 'Dallas, TX', 'category': 'Tournaments'},
        ]

        return Response({
            'suggested_profiles': UserSummarySerializer(suggested_profiles, many=True, context={'request': request}).data,
            'trending_athletes': UserSummarySerializer(trending, many=True, context={'request': request}).data,
            'upcoming_events': upcoming_events
        })


# ==========================================
# EXPLORE & SEARCH APIS
# ==========================================

class ExploreAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if query:
            users = User.objects.filter(
                Q(username__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(profile__sport__icontains=query)
            ).select_related('profile')[:20]

            posts = Post.objects.filter(
                Q(content__icontains=query) |
                Q(author__username__icontains=query) |
                Q(author__profile__sport__icontains=query)
            ).select_related('author', 'author__profile')[:24]
        else:
            users = User.objects.all().select_related('profile')[:20]
            posts = Post.objects.all().select_related('author', 'author__profile').order_by('-created_at')[:24]

        return Response({
            'query': query,
            'users': UserSummarySerializer(users, many=True, context={'request': request}).data,
            'posts': PostSerializer(posts, many=True, context={'request': request}).data
        })


class GlobalSearchAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        role = request.query_params.get('role', '').strip()
        sport = request.query_params.get('sport', '').strip()
        location = request.query_params.get('location', '').strip()

        users = User.objects.all().select_related('profile')
        posts = Post.objects.all().select_related('author', 'author__profile')

        if q:
            users = users.filter(
                Q(username__icontains=q) |
                Q(first_name__icontains=q) |
                Q(last_name__icontains=q) |
                Q(profile__bio__icontains=q)
            )
            posts = posts.filter(content__icontains=q)

        if role:
            users = users.filter(role=role)
            posts = posts.filter(author__role=role)

        if sport:
            users = users.filter(profile__sport__icontains=sport)
            posts = posts.filter(author__profile__sport__icontains=sport)

        if location:
            users = users.filter(profile__location__icontains=location)
            posts = posts.filter(author__profile__location__icontains=location)

        users = users.distinct()[:25]
        posts = posts.distinct()[:25]

        return Response({
            'users': UserSummarySerializer(users, many=True, context={'request': request}).data,
            'posts': PostSerializer(posts, many=True, context={'request': request}).data
        })


# ==========================================
# MESSAGING APIS
# ==========================================

class ConversationListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sent_recipients = Message.objects.filter(sender=request.user).values_list('receiver', flat=True)
        received_senders = Message.objects.filter(receiver=request.user).values_list('sender', flat=True)
        chat_user_ids = set(list(sent_recipients) + list(received_senders))

        chat_users = User.objects.filter(id__in=chat_user_ids).select_related('profile')
        conversations = []

        for cu in chat_users:
            last_msg = Message.objects.filter(
                (Q(sender=request.user) & Q(receiver=cu)) |
                (Q(sender=cu) & Q(receiver=request.user))
            ).order_by('-timestamp').first()

            unread_count = Message.objects.filter(
                sender=cu, receiver=request.user, is_read=False
            ).count()

            conversations.append({
                'user': UserSummarySerializer(cu, context={'request': request}).data,
                'last_message': last_msg.content or ("[Sent an image]" if last_msg and last_msg.image else ""),
                'time': last_msg.timestamp.strftime('%I:%M %p') if last_msg else '',
                'raw_time': last_msg.timestamp if last_msg else None,
                'unread_count': unread_count
            })

        conversations.sort(key=lambda x: x['raw_time'] or datetime.datetime.min, reverse=True)
        return Response(conversations)


class ChatMessagesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get(self, request, username):
        active_partner = get_object_or_404(User, username=username)
        # Mark messages as read
        Message.objects.filter(sender=active_partner, receiver=request.user, is_read=False).update(is_read=True)

        messages_history = Message.objects.filter(
            (Q(sender=request.user) & Q(receiver=active_partner)) |
            (Q(sender=active_partner) & Q(receiver=request.user))
        ).order_by('timestamp').select_related('sender', 'receiver', 'sender__profile', 'receiver__profile')

        serializer = MessageSerializer(messages_history, many=True, context={'request': request})
        return Response({
            'partner': UserSummarySerializer(active_partner, context={'request': request}).data,
            'messages': serializer.data
        })

    def post(self, request, username):
        active_partner = get_object_or_404(User, username=username)
        if active_partner == request.user:
            return Response({'error': 'You cannot chat with yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        content = request.data.get('content', '').strip()
        image = request.FILES.get('image')

        if not content and not image:
            return Response({'error': 'Please provide message content or an image.'}, status=status.HTTP_400_BAD_REQUEST)

        msg = Message.objects.create(
            sender=request.user,
            receiver=active_partner,
            content=content,
            image=image
        )

        Notification.objects.create(
            recipient=active_partner,
            sender=request.user,
            notification_type=Notification.NotificationType.MESSAGE,
            content_preview=content[:50] if content else "[Sent an image]"
        )

        serializer = MessageSerializer(msg, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ==========================================
# NOTIFICATIONS APIS
# ==========================================

class NotificationListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifications = request.user.notifications.all().select_related('sender', 'sender__profile', 'post')
        serializer = NotificationSerializer(notifications, many=True, context={'request': request})
        unread_count = request.user.notifications.filter(is_read=False).count()
        return Response({
            'notifications': serializer.data,
            'unread_count': unread_count
        })

    def delete(self, request):
        request.user.notifications.all().delete()
        return Response({'message': 'All notifications cleared.'})


class MarkNotificationsReadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.notifications.filter(is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'})


class ClearNotificationsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.notifications.all().delete()
        return Response({'message': 'All notifications cleared.'})

    def delete(self, request):
        request.user.notifications.all().delete()
        return Response({'message': 'All notifications cleared.'})


class NotificationDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, notification_id):
        request.user.notifications.filter(id=notification_id).delete()
        return Response({'message': 'Notification deleted.'})


# ==========================================
# RECRUITMENT APIS
# ==========================================

class RecruitmentListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        sport = request.query_params.get('sport', '').strip()

        posts = RecruitmentPost.objects.all().select_related('club', 'club__profile')
        if q:
            posts = posts.filter(
                Q(title__icontains=q) |
                Q(description__icontains=q) |
                Q(location__icontains=q) |
                Q(club__username__icontains=q)
            )
        if sport:
            posts = posts.filter(sport__icontains=sport)

        serializer = RecruitmentPostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        if request.user.role != User.Role.CLUB:
            return Response({'error': 'Only clubs can create recruitment listings.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = RecruitmentPostSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(club=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RecruitmentDetailUpdateDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, post_id):
        post = get_object_or_404(RecruitmentPost, id=post_id)
        serializer = RecruitmentPostSerializer(post, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, post_id):
        post = get_object_or_404(RecruitmentPost, id=post_id)
        if post.club != request.user and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = RecruitmentPostSerializer(post, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, post_id):
        post = get_object_or_404(RecruitmentPost, id=post_id)
        if post.club != request.user and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        post.delete()
        return Response({'message': 'Recruitment post deleted successfully.'})


class ApplyRecruitmentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def post(self, request, post_id):
        if request.user.role != User.Role.PLAYER and not request.user.is_superuser:
            return Response({'error': 'Only players can apply to recruitment posts.'}, status=status.HTTP_403_FORBIDDEN)

        post = get_object_or_404(RecruitmentPost, id=post_id)
        if Application.objects.filter(post=post, player=request.user).exists():
            return Response({'error': 'You have already applied to this listing.'}, status=status.HTTP_400_BAD_REQUEST)

        resume = request.FILES.get('resume') or request.FILES.get('resume_file')
        certificates = request.FILES.get('certificates') or request.FILES.get('certificates_file')

        application = Application.objects.create(
            post=post,
            player=request.user,
            resume=resume if resume else 'resumes/default_resume.pdf',
            certificates=certificates
        )

        Notification.objects.create(
            recipient=post.club,
            sender=request.user,
            notification_type=Notification.NotificationType.SYSTEM,
            content_preview=f"{request.user.username} applied to '{post.title}'"
        )

        serializer = ApplicationSerializer(application, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PlayerApplicationsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.PLAYER:
            return Response({'error': 'Only players can view their applications.'}, status=status.HTTP_403_FORBIDDEN)

        apps = Application.objects.filter(player=request.user).select_related('post', 'post__club')
        serializer = ApplicationSerializer(apps, many=True, context={'request': request})
        return Response(serializer.data)


class ClubDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.CLUB:
            return Response({'error': 'Only club accounts can access the Club Dashboard.'}, status=status.HTTP_403_FORBIDDEN)

        posts = RecruitmentPost.objects.filter(club=request.user)
        applications = Application.objects.filter(post__club=request.user).select_related('post', 'player', 'player__profile')
        members = ClubMember.objects.filter(club=request.user).select_related('player', 'player__profile')

        existing_member_ids = members.values_list('player_id', flat=True)
        available_players = User.objects.filter(role=User.Role.PLAYER).exclude(id__in=existing_member_ids).select_related('profile')

        return Response({
            'posts': RecruitmentPostSerializer(posts, many=True, context={'request': request}).data,
            'applications': ApplicationSerializer(applications, many=True, context={'request': request}).data,
            'members': ClubMemberSerializer(members, many=True, context={'request': request}).data,
            'available_players': UserSummarySerializer(available_players, many=True, context={'request': request}).data
        })


class UpdateApplicationStatusAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, app_id):
        if request.user.role != User.Role.CLUB:
            return Response({'error': 'Only clubs can update application statuses.'}, status=status.HTTP_403_FORBIDDEN)

        app = get_object_or_404(Application, id=app_id, post__club=request.user)
        new_status = request.data.get('status')

        if new_status in [Application.ApplicationStatus.ACCEPTED, Application.ApplicationStatus.REJECTED]:
            app.status = new_status
            app.save()

            if new_status == Application.ApplicationStatus.ACCEPTED:
                ClubMember.objects.get_or_create(club=request.user, player=app.player)
            else:
                ClubMember.objects.filter(club=request.user, player=app.player).delete()

            Notification.objects.create(
                recipient=app.player,
                sender=request.user,
                notification_type=Notification.NotificationType.SYSTEM,
                content_preview=f"Your application for '{app.post.title}' was {app.status.lower()}."
            )

            return Response({
                'status': app.status,
                'message': f"Application marked as {app.status}."
            })
        return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)


class ClubMemberManagementAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != User.Role.CLUB:
            return Response({'error': 'Only clubs can manage team members.'}, status=status.HTTP_403_FORBIDDEN)

        player_id = request.data.get('player_id')
        player = get_object_or_404(User, id=player_id, role=User.Role.PLAYER)
        member, created = ClubMember.objects.get_or_create(club=request.user, player=player)
        return Response({
            'created': created,
            'member': ClubMemberSerializer(member, context={'request': request}).data,
            'message': f"{player.username} added to team roster."
        })

    def delete(self, request, member_id):
        if request.user.role != User.Role.CLUB:
            return Response({'error': 'Only clubs can manage team members.'}, status=status.HTTP_403_FORBIDDEN)

        member = get_object_or_404(ClubMember, id=member_id, club=request.user)
        username = member.player.username
        member.delete()
        return Response({'message': f"{username} removed from team roster."})


# ==========================================
# TOURNAMENTS APIS
# ==========================================

class TournamentListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        sport = request.query_params.get('sport', '').strip()

        tournaments = Tournament.objects.all().select_related('creator').prefetch_related('registered_teams', 'matches')
        if q:
            tournaments = tournaments.filter(
                Q(name__icontains=q) |
                Q(description__icontains=q) |
                Q(venue__icontains=q) |
                Q(creator__username__icontains=q)
            )
        if sport:
            tournaments = tournaments.filter(sport__icontains=sport)

        serializer = TournamentSerializer(tournaments, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        if request.user.role not in [User.Role.CLUB, User.Role.ASSOCIATION]:
            return Response({'error': 'Only club and association accounts can host tournaments.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = TournamentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(creator=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TournamentDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, tournament_id):
        tournament = get_object_or_404(Tournament, id=tournament_id)
        serializer = TournamentSerializer(tournament, context={'request': request})
        return Response(serializer.data)


class RegisterTournamentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, tournament_id):
        if request.user.role != User.Role.CLUB:
            return Response({'error': 'Only club accounts can register their team to tournaments.'}, status=status.HTTP_403_FORBIDDEN)

        tournament = get_object_or_404(Tournament, id=tournament_id)
        if tournament.registered_teams.filter(id=request.user.id).exists():
            return Response({'error': 'Your club is already registered for this tournament.'}, status=status.HTTP_400_BAD_REQUEST)

        tournament.registered_teams.add(request.user)
        Notification.objects.create(
            recipient=tournament.creator,
            sender=request.user,
            notification_type=Notification.NotificationType.SYSTEM,
            content_preview=f"Team '{request.user.username}' registered for '{tournament.name}'"
        )

        return Response({'message': f"Successfully registered team for '{tournament.name}'!"})


class GenerateFixturesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, tournament_id):
        tournament = get_object_or_404(Tournament, id=tournament_id)
        if tournament.creator != request.user and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if tournament.matches.exists():
            return Response({'error': 'Fixtures have already been generated for this tournament.'}, status=status.HTTP_400_BAD_REQUEST)

        teams = list(tournament.registered_teams.all())
        if len(teams) < 2:
            return Response({'error': 'At least 2 registered teams are required to generate fixtures.'}, status=status.HTTP_400_BAD_REQUEST)

        match_date = tournament.start_date
        pairings = list(combinations(teams, 2))

        for i, (team1, team2) in enumerate(pairings):
            Match.objects.create(
                tournament=tournament,
                home_team=team1,
                away_team=team2,
                match_date=datetime.datetime.combine(match_date + datetime.timedelta(days=i), datetime.time(15, 0))
            )

        for team in teams:
            if team != request.user:
                Notification.objects.create(
                    recipient=team,
                    sender=request.user,
                    notification_type=Notification.NotificationType.SYSTEM,
                    content_preview=f"Match fixtures generated for '{tournament.name}'"
                )

        serializer = TournamentSerializer(tournament, context={'request': request})
        return Response({
            'message': f"Successfully generated {len(pairings)} match fixtures!",
            'tournament': serializer.data
        })


class UpdateMatchScoreAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, match_id):
        match = get_object_or_404(Match, id=match_id)
        if match.tournament.creator != request.user and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        home_score = request.data.get('home_score')
        away_score = request.data.get('away_score')

        try:
            match.home_score = int(home_score)
            match.away_score = int(away_score)
            match.is_completed = True
            match.save()

            teams = match.tournament.registered_teams.all()
            for team in teams:
                Notification.objects.create(
                    recipient=team,
                    sender=request.user,
                    notification_type=Notification.NotificationType.SYSTEM,
                    content_preview=f"Score Update in '{match.tournament.name}': {match.home_team.username} {match.home_score} - {match.away_score} {match.away_team.username}"
                )

            return Response(MatchSerializer(match, context={'request': request}).data)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid score values entered.'}, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# SPONSORSHIP APIS
# ==========================================

class SponsorshipListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        sport = request.query_params.get('sport', '').strip()

        opportunities = SponsorshipOpportunity.objects.all().select_related('sponsor', 'sponsor__profile')
        if q:
            opportunities = opportunities.filter(
                Q(title__icontains=q) |
                Q(description__icontains=q) |
                Q(sponsor__username__icontains=q) |
                Q(sponsor__profile__company_name__icontains=q)
            )
        if sport:
            opportunities = opportunities.filter(sport_category__icontains=sport)

        serializer = SponsorshipOpportunitySerializer(opportunities, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        if request.user.role != User.Role.SPONSOR:
            return Response({'error': 'Only sponsors can create campaigns.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SponsorshipOpportunitySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(sponsor=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SponsorshipDetailUpdateDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, opp_id):
        opp = get_object_or_404(SponsorshipOpportunity, id=opp_id)
        serializer = SponsorshipOpportunitySerializer(opp, context={'request': request})
        return Response(serializer.data)

    def patch(self, request, opp_id):
        opp = get_object_or_404(SponsorshipOpportunity, id=opp_id)
        if opp.sponsor != request.user and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SponsorshipOpportunitySerializer(opp, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, opp_id):
        opp = get_object_or_404(SponsorshipOpportunity, id=opp_id)
        if opp.sponsor != request.user and not request.user.is_superuser:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        opp.delete()
        return Response({'message': 'Sponsorship opportunity deleted successfully.'})


class ApplySponsorshipAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, opp_id):
        if request.user.role != User.Role.PLAYER:
            return Response({'error': 'Only players can apply for sponsorships.'}, status=status.HTTP_403_FORBIDDEN)

        opp = get_object_or_404(SponsorshipOpportunity, id=opp_id)
        if SponsorshipApplication.objects.filter(opportunity=opp, player=request.user).exists():
            return Response({'error': 'You have already applied for this sponsorship opportunity.'}, status=status.HTTP_400_BAD_REQUEST)

        message = request.data.get('message', '').strip()
        app = SponsorshipApplication.objects.create(
            opportunity=opp,
            player=request.user,
            message=message
        )

        Notification.objects.create(
            recipient=opp.sponsor,
            sender=request.user,
            notification_type=Notification.NotificationType.SYSTEM,
            content_preview=f"{request.user.username} applied to '{opp.title}'"
        )

        serializer = SponsorshipApplicationSerializer(app, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PlayerSponsorshipApplicationsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.PLAYER:
            return Response({'error': 'Only players can view their applied sponsorships.'}, status=status.HTTP_403_FORBIDDEN)

        apps = SponsorshipApplication.objects.filter(player=request.user).select_related(
            'opportunity', 'opportunity__sponsor', 'opportunity__sponsor__profile'
        )
        serializer = SponsorshipApplicationSerializer(apps, many=True, context={'request': request})
        return Response(serializer.data)


class SponsorDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.SPONSOR:
            return Response({'error': 'Only sponsors can access the Sponsor Dashboard.'}, status=status.HTTP_403_FORBIDDEN)

        opportunities = SponsorshipOpportunity.objects.filter(sponsor=request.user)
        applications = SponsorshipApplication.objects.filter(opportunity__sponsor=request.user).select_related(
            'opportunity', 'player', 'player__profile'
        )

        return Response({
            'opportunities': SponsorshipOpportunitySerializer(opportunities, many=True, context={'request': request}).data,
            'applications': SponsorshipApplicationSerializer(applications, many=True, context={'request': request}).data
        })


class UpdateSponsorshipApplicationStatusAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, app_id):
        if request.user.role != User.Role.SPONSOR:
            return Response({'error': 'Only sponsors can update application statuses.'}, status=status.HTTP_403_FORBIDDEN)

        app = get_object_or_404(SponsorshipApplication, id=app_id, opportunity__sponsor=request.user)
        status_action = request.data.get('status')

        if status_action in [SponsorshipApplication.ApplicationStatus.ACCEPTED, SponsorshipApplication.ApplicationStatus.REJECTED]:
            app.status = status_action
            app.save()

            Notification.objects.create(
                recipient=app.player,
                sender=request.user,
                notification_type=Notification.NotificationType.SYSTEM,
                content_preview=f"Your application for '{app.opportunity.title}' was {app.status.lower()}."
            )

            return Response({
                'status': app.status,
                'message': f"Application for {app.player.username} marked as {app.status.lower()}."
            })
        return Response({'error': 'Invalid status choice.'}, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# PUBLIC BLOG APIS
# ==========================================

class PublicBlogListAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        blogs = Blog.objects.filter(is_published=True).select_related('author').order_by('-created_at')
        serializer = BlogSerializer(blogs, many=True, context={'request': request})
        return Response(serializer.data)


class LatestBlogsAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        latest = Blog.objects.filter(is_published=True).select_related('author').order_by('-created_at')[:4]
        serializer = BlogSerializer(latest, many=True, context={'request': request})
        return Response(serializer.data)


class PublicBlogDetailAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        if request.user.is_authenticated and request.user.is_superuser:
            blog = get_object_or_404(Blog, slug=slug)
        else:
            blog = get_object_or_404(Blog, slug=slug, is_published=True)
        serializer = BlogSerializer(blog, context={'request': request})
        return Response(serializer.data)


# ==========================================
# CONTACT / FEEDBACK APIS
# ==========================================

class ContactSubmitAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Your message has been submitted successfully! We will get back to you soon.'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# CUSTOM ADMIN DASHBOARD APIS (Superusers)
# ==========================================

class AdminStatsAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        stats = {
            'total_users': User.objects.count(),
            'players_count': User.objects.filter(role=User.Role.PLAYER).count(),
            'coaches_count': User.objects.filter(role=User.Role.COACH).count(),
            'clubs_count': User.objects.filter(role=User.Role.CLUB).count(),
            'associations_count': User.objects.filter(role=User.Role.ASSOCIATION).count(),
            'sponsors_count': User.objects.filter(role=User.Role.SPONSOR).count(),
            'scouts_count': User.objects.filter(role=User.Role.SCOUT).count(),
            'posts_count': Post.objects.count(),
            'comments_count': Comment.objects.count(),
            'tournaments_count': Tournament.objects.count(),
            'recruitment_count': RecruitmentPost.objects.count(),
            'sponsorships_count': SponsorshipOpportunity.objects.count(),
            'blogs_count': Blog.objects.count(),
            'unread_feedback_count': ContactMessage.objects.filter(is_read=False).count(),
        }
        return Response(stats)


class AdminUsersListAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        role = request.query_params.get('role')
        users = User.objects.all().select_related('profile').order_by('-date_joined')
        if role:
            users = users.filter(role=role)
        serializer = UserSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)


class AdminUserUpdateAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def patch(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        serializer = AdminUserUpdateSerializer(target_user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(target_user, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminUserToggleActiveAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        if target_user == request.user:
            return Response({'error': 'You cannot deactivate your own superuser account.'}, status=status.HTTP_400_BAD_REQUEST)

        target_user.is_active = not target_user.is_active
        target_user.save()
        status_str = "activated" if target_user.is_active else "deactivated"
        return Response({
            'is_active': target_user.is_active,
            'message': f"User '{target_user.username}' has been {status_str}."
        })


class AdminUserToggleVerifyAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        target_user.is_verified = not target_user.is_verified
        target_user.save()
        status_str = "verified" if target_user.is_verified else "unverified"
        return Response({
            'is_verified': target_user.is_verified,
            'message': f"User '{target_user.username}' is now {status_str}."
        })


class AdminUserDeleteAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        if target_user == request.user:
            return Response({'error': 'You cannot delete your own superuser account.'}, status=status.HTTP_400_BAD_REQUEST)
        username = target_user.username
        target_user.delete()
        return Response({'message': f"User '{username}' has been deleted."})


# --- Content Moderation APIs ---

class AdminPostsListAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        posts = Post.objects.all().select_related('author', 'author__profile').prefetch_related('likes', 'comments').order_by('-created_at')
        return Response(PostSerializer(posts, many=True, context={'request': request}).data)


class AdminCommentsListAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        comments = Comment.objects.all().select_related('author', 'post').order_by('-created_at')
        return Response(CommentSerializer(comments, many=True, context={'request': request}).data)


class AdminMessagesListAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        messages_list = Message.objects.all().select_related('sender', 'receiver').order_by('-timestamp')
        return Response(MessageSerializer(messages_list, many=True, context={'request': request}).data)


class AdminNotificationsListAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        notifications_list = Notification.objects.all().select_related('recipient', 'sender').order_by('-created_at')
        return Response(NotificationSerializer(notifications_list, many=True, context={'request': request}).data)


class AdminDeleteEntityAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, entity_type, entity_id):
        if entity_type == 'post':
            item = get_object_or_404(Post, id=entity_id)
        elif entity_type == 'comment':
            item = get_object_or_404(Comment, id=entity_id)
        elif entity_type == 'message':
            item = get_object_or_404(Message, id=entity_id)
        elif entity_type == 'notification':
            item = get_object_or_404(Notification, id=entity_id)
        elif entity_type == 'recruitment':
            item = get_object_or_404(RecruitmentPost, id=entity_id)
        elif entity_type == 'tournament':
            item = get_object_or_404(Tournament, id=entity_id)
        elif entity_type == 'sponsorship':
            item = get_object_or_404(SponsorshipOpportunity, id=entity_id)
        elif entity_type == 'feedback':
            item = get_object_or_404(ContactMessage, id=entity_id)
        else:
            return Response({'error': 'Invalid entity type.'}, status=status.HTTP_400_BAD_REQUEST)

        item.delete()
        return Response({'message': f"{entity_type.capitalize()} #{entity_id} deleted successfully."})


# --- Admin Blog APIs ---

class AdminBlogListCreateAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get(self, request):
        blogs = Blog.objects.all().select_related('author').order_by('-created_at')
        return Response(BlogSerializer(blogs, many=True, context={'request': request}).data)

    def post(self, request):
        serializer = BlogSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(author=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminBlogDetailUpdateDeleteAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get(self, request, blog_id):
        blog = get_object_or_404(Blog, id=blog_id)
        return Response(BlogSerializer(blog, context={'request': request}).data)

    def patch(self, request, blog_id):
        blog = get_object_or_404(Blog, id=blog_id)
        serializer = BlogSerializer(blog, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, blog_id):
        blog = get_object_or_404(Blog, id=blog_id)
        title = blog.title
        blog.delete()
        return Response({'message': f"Blog '{title}' deleted successfully."})


class AdminBlogTogglePublishAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, blog_id):
        blog = get_object_or_404(Blog, id=blog_id)
        blog.is_published = not blog.is_published
        blog.save()
        status_str = "published" if blog.is_published else "unpublished (draft)"
        return Response({
            'is_published': blog.is_published,
            'message': f"Blog '{blog.title}' is now {status_str}."
        })


# --- Admin Feedback APIs ---

class AdminFeedbackListAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        feedbacks = ContactMessage.objects.all().order_by('-created_at')
        return Response(ContactMessageSerializer(feedbacks, many=True).data)


class AdminFeedbackToggleReadAPIView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, feedback_id):
        msg = get_object_or_404(ContactMessage, id=feedback_id)
        msg.is_read = not msg.is_read
        msg.save()
        status_str = "read" if msg.is_read else "unread"
        return Response({
            'is_read': msg.is_read,
            'message': f"Feedback marked as {status_str}."
        })


# ==========================================
# STORY APIS (Instagram-like Stories)
# ==========================================

class StoryFeedTrayAPIView(APIView):
    """
    GET: Returns active stories for current user and followed users grouped by user.
    POST: Creates a new Story.
    Security: Only includes current user and users current user follows.
    Expiration: Only includes stories where expires_at > timezone.now().
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get(self, request):
        now = timezone.now()
        followed_users = list(request.user.following.all().select_related('profile'))
        
        # 1. Current user stories
        my_stories = Story.objects.filter(
            user=request.user,
            expires_at__gt=now
        ).select_related('user', 'user__profile').prefetch_related('views').order_by('created_at')

        my_stories_data = StorySerializer(my_stories, many=True, context={'request': request}).data
        my_has_unseen = any(not s['has_viewed'] for s in my_stories_data) if my_stories_data else False
        my_latest = my_stories.last().created_at if my_stories.exists() else timezone.now()

        tray_groups = [
            {
                'user': UserSummarySerializer(request.user, context={'request': request}).data,
                'stories': my_stories_data,
                'has_unseen': my_has_unseen,
                'latest_created_at': my_latest,
                'is_current_user': True
            }
        ]

        # 2. Followed users with active stories
        if followed_users:
            followed_user_ids = [u.id for u in followed_users]
            followed_stories = Story.objects.filter(
                user_id__in=followed_user_ids,
                expires_at__gt=now
            ).select_related('user', 'user__profile').prefetch_related('views').order_by('created_at')

            # Group stories by user
            from collections import defaultdict
            stories_by_user = defaultdict(list)
            for story in followed_stories:
                stories_by_user[story.user_id].append(story)

            other_groups = []
            for followed_user in followed_users:
                u_stories = stories_by_user.get(followed_user.id, [])
                if not u_stories:
                    continue  # Only show users with active stories in tray

                u_stories_data = StorySerializer(u_stories, many=True, context={'request': request}).data
                has_unseen = any(not s['has_viewed'] for s in u_stories_data)
                latest_time = u_stories[-1].created_at

                other_groups.append({
                    'user': UserSummarySerializer(followed_user, context={'request': request}).data,
                    'stories': u_stories_data,
                    'has_unseen': has_unseen,
                    'latest_created_at': latest_time,
                    'is_current_user': False
                })

            # Sort followed users: unseen stories first, then by latest story creation time descending
            other_groups.sort(key=lambda g: (not g['has_unseen'], -g['latest_created_at'].timestamp()))
            tray_groups.extend(other_groups)

        return Response(tray_groups)

    def post(self, request):
        return create_story_from_request(request)


def create_story_from_request(request):
    story_type = request.data.get('story_type', Story.StoryType.IMAGE)
    valid_types = [t[0] for t in Story.StoryType.choices]
    if story_type not in valid_types:
        story_type = Story.StoryType.IMAGE

    media = request.FILES.get('media')
    text_content = request.data.get('text_content', '').strip()
    background_style = request.data.get('background_style', 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)')

    if story_type in [Story.StoryType.IMAGE, Story.StoryType.VIDEO] and not media and not text_content:
        return Response({'error': 'Please provide media or text for your story.'}, status=status.HTTP_400_BAD_REQUEST)

    if story_type == Story.StoryType.TEXT and not text_content:
        return Response({'error': 'Please provide text for your story.'}, status=status.HTTP_400_BAD_REQUEST)

    expires_at = timezone.now() + datetime.timedelta(hours=24)

    story = Story.objects.create(
        user=request.user,
        story_type=story_type,
        media=media,
        text_content=text_content,
        background_style=background_style,
        expires_at=expires_at
    )

    serializer = StorySerializer(story, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


class StoryCreateAPIView(APIView):
    """
    Creates a new Story (Image, Video, or Text with background gradient).
    Sets 24-hour expiration automatically.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def post(self, request):
        return create_story_from_request(request)


class StoryDetailAPIView(APIView):
    """
    GET: Retrieves a single story. Enforces 24-hour expiration and one-way follow authorization.
    DELETE: Deletes a story. Owner or superuser only.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, story_id):
        story = get_object_or_404(Story.objects.select_related('user', 'user__profile'), id=story_id)

        # Check expiration
        if not story.is_active:
            return Response({'error': 'This story has expired.'}, status=status.HTTP_404_NOT_FOUND)

        # Check visibility: owner OR follower
        is_owner = (story.user == request.user or request.user.is_superuser)
        is_follower = Follow.objects.filter(follower=request.user, following=story.user).exists()

        if not (is_owner or is_follower):
            return Response({'error': 'You do not have permission to view this story.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = StorySerializer(story, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, story_id):
        story = get_object_or_404(Story, id=story_id)

        if story.user != request.user and not request.user.is_superuser:
            return Response({'error': 'Permission denied. You can only delete your own stories.'}, status=status.HTTP_403_FORBIDDEN)

        story.delete()
        return Response({'message': 'Story deleted successfully.'}, status=status.HTTP_200_OK)


class StoryRecordViewAPIView(APIView):
    """
    Records a view on an active story.
    Enforces authorization (owner or follower).
    Prevents duplicate views via StoryView unique constraint.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, story_id):
        story = get_object_or_404(Story, id=story_id)

        if not story.is_active:
            return Response({'error': 'This story has expired.'}, status=status.HTTP_404_NOT_FOUND)

        is_owner = (story.user == request.user)
        is_follower = Follow.objects.filter(follower=request.user, following=story.user).exists()

        if not (is_owner or is_follower):
            return Response({'error': 'You do not have permission to view this story.'}, status=status.HTTP_403_FORBIDDEN)

        # Record view if viewer is not the owner
        if not is_owner:
            StoryView.objects.get_or_create(story=story, viewer=request.user)

        views_count = story.views.count()
        return Response({
            'success': True,
            'story_id': story.id,
            'views_count': views_count
        })


class StoryViewersListAPIView(APIView):
    """
    Returns list of viewers for a story.
    Strictly restricted to the story owner (or superuser).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, story_id):
        story = get_object_or_404(Story, id=story_id)

        if story.user != request.user and not request.user.is_superuser:
            return Response({'error': 'Only the story owner can see story viewers.'}, status=status.HTTP_403_FORBIDDEN)

        views = StoryView.objects.filter(story=story).select_related('viewer', 'viewer__profile').order_by('-viewed_at')
        serializer = StoryViewSerializer(views, many=True, context={'request': request})
        return Response({
            'story_id': story.id,
            'viewers_count': views.count(),
            'viewers': serializer.data
        })


class UserActiveStoriesAPIView(APIView):
    """
    Returns active stories for a specific user.
    Allowed only if requester is the user OR follows the user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
        target_user = get_object_or_404(User.objects.select_related('profile'), username__iexact=username)

        is_owner = (target_user == request.user or request.user.is_superuser)
        is_follower = Follow.objects.filter(follower=request.user, following=target_user).exists()

        if not (is_owner or is_follower):
            return Response({'error': 'You must follow this user to view their stories.'}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        active_stories = Story.objects.filter(
            user=target_user,
            expires_at__gt=now
        ).select_related('user', 'user__profile').prefetch_related('views').order_by('created_at')

        serializer = StorySerializer(active_stories, many=True, context={'request': request})
        return Response({
            'user': UserSummarySerializer(target_user, context={'request': request}).data,
            'stories': serializer.data,
            'count': active_stories.count()
        })
