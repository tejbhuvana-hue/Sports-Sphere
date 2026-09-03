import datetime
from unittest.mock import patch
from django.core import mail
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token

from core.models import PendingRegistration, Profile

User = get_user_model()


class RegistrationOTPAPITests(APITestCase):
    def setUp(self):
        self.request_otp_url = reverse('api_register_request_otp')
        self.verify_otp_url = reverse('api_register_verify_otp')
        self.resend_otp_url = reverse('api_register_resend_otp')
        self.login_url = reverse('api_login')

        self.valid_payload = {
            'username': 'newathlete',
            'email': 'newathlete@example.com',
            'password': 'SecurePassword123!',
            'role': User.Role.PLAYER
        }

    def test_request_otp_success(self):
        """Test requesting OTP with valid data generates pending registration and sends email without creating User."""
        response = self.client.post(self.request_otp_url, self.valid_payload)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)
        self.assertEqual(response.data['email'], 'newathlete@example.com')
        self.assertEqual(response.data['expires_in'], 600)
        # Ensure OTP is NEVER exposed in the response
        self.assertNotIn('otp', response.data)

        # Ensure no User is created yet
        self.assertFalse(User.objects.filter(email='newathlete@example.com').exists())

        # Ensure PendingRegistration record is created
        pending = PendingRegistration.objects.filter(email='newathlete@example.com').first()
        self.assertIsNotNone(pending)
        self.assertEqual(pending.username, 'newathlete')
        self.assertEqual(pending.role, User.Role.PLAYER)
        self.assertEqual(pending.attempts, 0)
        self.assertFalse(pending.is_expired())

        # Verify email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['newathlete@example.com'])
        self.assertIn('Verification Code', mail.outbox[0].subject)

    def test_request_otp_duplicate_email(self):
        """Test requesting OTP with an email that is already registered."""
        User.objects.create_user(
            username='existinguser',
            email='existing@example.com',
            password='Password123!'
        )

        payload = self.valid_payload.copy()
        payload['email'] = 'EXISTING@example.com'  # Case-insensitive check

        response = self.client.post(self.request_otp_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', response.data['error'])
        self.assertFalse(PendingRegistration.objects.filter(email='existing@example.com').exists())

    def test_request_otp_duplicate_username(self):
        """Test requesting OTP with a username that is already registered."""
        User.objects.create_user(
            username='existinguser',
            email='someone@example.com',
            password='Password123!'
        )

        payload = self.valid_payload.copy()
        payload['username'] = 'EXISTINGUSER'

        response = self.client.post(self.request_otp_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', response.data['error'])

    def test_request_otp_invalid_role(self):
        """Test requesting OTP with an invalid role."""
        payload = self.valid_payload.copy()
        payload['role'] = 'SUPER_ADMIN_INVALID'

        response = self.client.post(self.request_otp_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(PendingRegistration.objects.filter(email=payload['email']).exists())

    def test_otp_and_password_not_stored_plaintext(self):
        """Test that neither OTP nor password is saved in plaintext in the database."""
        response = self.client.post(self.request_otp_url, self.valid_payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        pending = PendingRegistration.objects.get(email='newathlete@example.com')

        # Password must be securely hashed
        self.assertNotEqual(pending.password, self.valid_payload['password'])
        self.assertTrue(check_password(self.valid_payload['password'], pending.password))

        # OTP must be securely hashed
        self.assertEqual(len(mail.outbox), 1)
        raw_email_body = mail.outbox[0].body
        # Extract 6-digit OTP from email body
        import re
        otp_match = re.search(r'\b\d{6}\b', raw_email_body)
        self.assertIsNotNone(otp_match)
        raw_otp = otp_match.group(0)

        self.assertNotEqual(pending.otp_hash, raw_otp)
        self.assertTrue(pending.check_otp(raw_otp))

    def test_verify_otp_success_creates_user_profile_token(self):
        """Test verifying the correct OTP creates the User, Profile, Token, and deletes PendingRegistration."""
        self.client.post(self.request_otp_url, self.valid_payload)
        self.assertEqual(len(mail.outbox), 1)

        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)

        verify_response = self.client.post(self.verify_otp_url, {
            'email': 'newathlete@example.com',
            'otp': raw_otp
        })

        self.assertEqual(verify_response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', verify_response.data)
        self.assertIn('user', verify_response.data)
        self.assertEqual(verify_response.data['user']['username'], 'newathlete')
        self.assertEqual(verify_response.data['user']['email'], 'newathlete@example.com')
        self.assertEqual(verify_response.data['user']['role'], User.Role.PLAYER)
        self.assertTrue(verify_response.data['user']['is_verified'])

        # User exists in database
        user = User.objects.get(email='newathlete@example.com')
        self.assertEqual(user.username, 'newathlete')
        self.assertTrue(user.is_verified)

        # Profile automatically created via post_save signal
        self.assertTrue(hasattr(user, 'profile'))
        self.assertIsInstance(user.profile, Profile)

        # DRF Token created
        token = Token.objects.get(user=user)
        self.assertEqual(verify_response.data['token'], token.key)

        # PendingRegistration deleted
        self.assertFalse(PendingRegistration.objects.filter(email='newathlete@example.com').exists())

    def test_verify_otp_incorrect_code_increments_attempts(self):
        """Test verifying with an incorrect OTP increments attempts and returns remaining attempts."""
        self.client.post(self.request_otp_url, self.valid_payload)
        pending = PendingRegistration.objects.get(email='newathlete@example.com')
        self.assertEqual(pending.attempts, 0)

        verify_response = self.client.post(self.verify_otp_url, {
            'email': 'newathlete@example.com',
            'otp': '999999'  # Wrong OTP
        })

        self.assertEqual(verify_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('remaining', verify_response.data['error'])
        self.assertEqual(verify_response.data.get('remaining_attempts'), 4)

        # User NOT created
        self.assertFalse(User.objects.filter(email='newathlete@example.com').exists())

        # Attempts incremented
        pending.refresh_from_db()
        self.assertEqual(pending.attempts, 1)

    def test_verify_otp_max_5_attempts_invalidates(self):
        """Test that after 5 failed attempts, the pending registration is invalidated and deleted."""
        self.client.post(self.request_otp_url, self.valid_payload)

        for attempt in range(1, 5):
            res = self.client.post(self.verify_otp_url, {
                'email': 'newathlete@example.com',
                'otp': f'11111{attempt}'
            })
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(res.data.get('remaining_attempts'), 5 - attempt)

        # 5th attempt: should invalidate
        res5 = self.client.post(self.verify_otp_url, {
            'email': 'newathlete@example.com',
            'otp': '999999'
        })
        self.assertEqual(res5.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Maximum verification attempts exceeded', res5.data['error'])

        # PendingRegistration deleted
        self.assertFalse(PendingRegistration.objects.filter(email='newathlete@example.com').exists())
        self.assertFalse(User.objects.filter(email='newathlete@example.com').exists())

    def test_verify_otp_expired(self):
        """Test verifying an expired OTP returns an error and removes the pending registration."""
        self.client.post(self.request_otp_url, self.valid_payload)
        pending = PendingRegistration.objects.get(email='newathlete@example.com')

        # Expire the pending registration
        pending.expires_at = timezone.now() - datetime.timedelta(seconds=1)
        pending.save()

        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)

        verify_response = self.client.post(self.verify_otp_url, {
            'email': 'newathlete@example.com',
            'otp': raw_otp
        })

        self.assertEqual(verify_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', verify_response.data['error'].lower())
        self.assertFalse(PendingRegistration.objects.filter(email='newathlete@example.com').exists())
        self.assertFalse(User.objects.filter(email='newathlete@example.com').exists())

    def test_resend_otp_cooldown_enforced(self):
        """Test resending OTP within 60 seconds returns HTTP 429 Too Many Requests."""
        self.client.post(self.request_otp_url, self.valid_payload)
        self.assertEqual(len(mail.outbox), 1)

        # Immediate resend should be blocked by cooldown
        resend_response = self.client.post(self.resend_otp_url, {
            'email': 'newathlete@example.com'
        })
        self.assertEqual(resend_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('cooldown_remaining', resend_response.data)
        self.assertEqual(len(mail.outbox), 1)  # No second email sent

    def test_resend_otp_success_after_cooldown(self):
        """Test resending OTP after 60 seconds generates a new code and resets expiration/attempts."""
        self.client.post(self.request_otp_url, self.valid_payload)
        pending = PendingRegistration.objects.get(email='newathlete@example.com')
        old_hash = pending.otp_hash

        # Increment attempts to 2 and simulate 65 seconds elapsed
        pending.attempts = 2
        pending.last_sent_at = timezone.now() - datetime.timedelta(seconds=65)
        pending.save()

        resend_response = self.client.post(self.resend_otp_url, {
            'email': 'newathlete@example.com'
        })

        self.assertEqual(resend_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 2)  # Second email sent

        pending.refresh_from_db()
        self.assertNotEqual(pending.otp_hash, old_hash)
        self.assertEqual(pending.attempts, 0)
        self.assertGreater(pending.expires_at, timezone.now() + datetime.timedelta(minutes=9))

    def test_new_otp_invalidates_old_otp(self):
        """Test that requesting a new OTP invalidates the previous OTP code."""
        self.client.post(self.request_otp_url, self.valid_payload)
        import re
        otp1 = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)

        # Move last_sent_at back 65 seconds to allow resend
        pending = PendingRegistration.objects.get(email='newathlete@example.com')
        pending.last_sent_at = timezone.now() - datetime.timedelta(seconds=65)
        pending.save()

        self.client.post(self.resend_otp_url, {'email': 'newathlete@example.com'})
        otp2 = re.search(r'\b\d{6}\b', mail.outbox[1].body).group(0)

        # Attempting verify with old OTP1 should fail
        fail_response = self.client.post(self.verify_otp_url, {
            'email': 'newathlete@example.com',
            'otp': otp1
        })
        self.assertEqual(fail_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='newathlete@example.com').exists())

        # Attempting verify with new OTP2 should succeed
        success_response = self.client.post(self.verify_otp_url, {
            'email': 'newathlete@example.com',
            'otp': otp2
        })
        self.assertEqual(success_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newathlete@example.com').exists())

    def test_account_can_login_normally_after_otp_verification(self):
        """Test that a user registered via OTP can log in with username or email using normal login."""
        self.client.post(self.request_otp_url, self.valid_payload)
        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)

        # Verify OTP
        verify_res = self.client.post(self.verify_otp_url, {
            'email': 'newathlete@example.com',
            'otp': raw_otp
        })
        self.assertEqual(verify_res.status_code, status.HTTP_201_CREATED)

        # 1. Login with username
        login_res1 = self.client.post(self.login_url, {
            'username': 'newathlete',
            'password': 'SecurePassword123!'
        })
        self.assertEqual(login_res1.status_code, status.HTTP_200_OK)
        self.assertIn('token', login_res1.data)
        self.assertEqual(login_res1.data['user']['username'], 'newathlete')

        # 2. Login with email
        login_res2 = self.client.post(self.login_url, {
            'username': 'newathlete@example.com',
            'password': 'SecurePassword123!'
        })
        self.assertEqual(login_res2.status_code, status.HTTP_200_OK)
        self.assertIn('token', login_res2.data)
        self.assertEqual(login_res2.data['user']['email'], 'newathlete@example.com')

    def test_duplicate_verification_race_safety(self):
        """Test race condition safety: if user is created right before verify-otp commits, it safely rejects."""
        self.client.post(self.request_otp_url, self.valid_payload)
        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)

        # Simulate another process creating a User with same email before verify commits
        User.objects.create_user(
            username='race_winner',
            email='newathlete@example.com',
            password='SomePassword123!'
        )

        response = self.client.post(self.verify_otp_url, {
            'email': 'newathlete@example.com',
            'otp': raw_otp
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', response.data['error'])
        # PendingRegistration should be cleaned up
        self.assertFalse(PendingRegistration.objects.filter(email='newathlete@example.com').exists())
