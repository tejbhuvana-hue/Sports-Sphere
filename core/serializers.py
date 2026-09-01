from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import (
    Profile, Post, Comment, Notification, Message, Follow,
    RecruitmentPost, Application, ClubMember, Tournament, Match,
    SponsorshipOpportunity, SponsorshipApplication,
    ResumeExperience, ResumeAchievement, ResumeCertificate, ResumeStatistic,
    Endorsement, Recommendation, ContactMessage, Blog
)

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            'id', 'profile_picture', 'cover_banner', 'bio', 'location', 'is_online',
            'sport', 'position', 'achievements',
            'certifications', 'experience',
            'club_info',
            'org_info',
            'company_name', 'company_website', 'company_industry', 'company_profile',
            'recruitment_profile'
        ]


class UserSummarySerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()
    sport = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'role', 'is_verified', 'profile_picture', 'sport', 'location']

    def get_profile_picture(self, obj):
        if hasattr(obj, 'profile') and obj.profile.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile.profile_picture.url)
            return obj.profile.profile_picture.url
        return None

    def get_sport(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.sport or ''
        return ''

    def get_location(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.location or ''
        return ''


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_verified', 'is_active', 'is_superuser',
            'date_joined', 'profile', 'followers_count', 'following_count', 'is_following'
        ]
        read_only_fields = ['id', 'date_joined', 'is_superuser']

    def get_followers_count(self, obj):
        return Follow.objects.filter(following=obj).count()

    def get_following_count(self, obj):
        return Follow.objects.filter(follower=obj).count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, following=obj).exists()
        return False


class CommentSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)
    is_author = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'content', 'created_at', 'is_author']
        read_only_fields = ['id', 'author', 'created_at']

    def get_is_author(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.author == request.user or request.user.is_superuser
        return False


class PostSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    is_author = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'content', 'image', 'video',
            'created_at', 'updated_at',
            'likes_count', 'comments_count', 'comments',
            'is_liked', 'is_saved', 'is_author'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.saved_by.filter(id=request.user.id).exists()
        return False

    def get_is_author(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.author == request.user or request.user.is_superuser
        return False


class NotificationSerializer(serializers.ModelSerializer):
    sender = UserSummarySerializer(read_only=True)
    message = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'sender', 'notification_type',
            'post', 'is_read', 'content_preview', 'created_at', 'message'
        ]
        read_only_fields = ['id', 'recipient', 'sender', 'created_at']

    def get_message(self, obj):
        if obj.content_preview:
            return obj.content_preview
        sender_name = obj.sender.username if obj.sender else "System"
        if obj.notification_type == Notification.NotificationType.LIKE:
            return f"{sender_name} liked your post."
        elif obj.notification_type == Notification.NotificationType.COMMENT:
            return f"{sender_name} commented on your post."
        elif obj.notification_type == Notification.NotificationType.FOLLOW:
            return f"{sender_name} started following you."
        elif obj.notification_type == Notification.NotificationType.MESSAGE:
            return f"New message from {sender_name}"
        return "You have a new update."


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSummarySerializer(read_only=True)
    receiver = UserSummarySerializer(read_only=True)
    time = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'receiver', 'content', 'image', 'timestamp', 'time', 'is_read']
        read_only_fields = ['id', 'sender', 'timestamp']

    def get_time(self, obj):
        return obj.timestamp.strftime('%I:%M %p')


class ConversationSerializer(serializers.Serializer):
    user = UserSummarySerializer()
    last_message = serializers.CharField(allow_blank=True)
    time = serializers.CharField(allow_blank=True)
    raw_time = serializers.DateTimeField(allow_null=True)
    unread_count = serializers.IntegerField()


class FollowSerializer(serializers.ModelSerializer):
    follower = UserSummarySerializer(read_only=True)
    following = UserSummarySerializer(read_only=True)

    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following', 'created_at']


class RecruitmentPostSerializer(serializers.ModelSerializer):
    club = UserSummarySerializer(read_only=True)
    applications_count = serializers.SerializerMethodField()
    is_applied = serializers.SerializerMethodField()
    my_application_status = serializers.SerializerMethodField()
    my_application_id = serializers.SerializerMethodField()
    location = serializers.CharField(required=False, allow_blank=True, default='City Stadium')
    last_date = serializers.DateField(required=False, allow_null=True)
    position_needed = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = RecruitmentPost
        fields = [
            'id', 'club', 'title', 'sport', 'description', 'location',
            'last_date', 'created_at', 'applications_count',
            'is_applied', 'my_application_status', 'my_application_id',
            'position_needed'
        ]
        read_only_fields = ['id', 'club', 'created_at']

    def create(self, validated_data):
        pos = validated_data.pop('position_needed', None)
        if pos and pos not in validated_data.get('title', ''):
            validated_data['description'] = f"[Position: {pos}] " + validated_data.get('description', '')
        if not validated_data.get('location'):
            validated_data['location'] = 'Main Grounds'
        if not validated_data.get('last_date'):
            import datetime
            validated_data['last_date'] = datetime.date.today() + datetime.timedelta(days=30)
        return super().create(validated_data)

    def get_applications_count(self, obj):
        return obj.applications.count()

    def get_is_applied(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.applications.filter(player=request.user).exists()
        return False

    def get_my_application_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            app = obj.applications.filter(player=request.user).first()
            if app:
                return app.status
        return None

    def get_my_application_id(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            app = obj.applications.filter(player=request.user).first()
            if app:
                return app.id
        return None


class ApplicationSerializer(serializers.ModelSerializer):
    player = UserSummarySerializer(read_only=True)
    post_title = serializers.CharField(source='post.title', read_only=True)
    club = UserSummarySerializer(source='post.club', read_only=True)
    resume = serializers.FileField(required=False, allow_null=True)
    certificates = serializers.FileField(required=False, allow_null=True)
    cover_letter = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Application
        fields = ['id', 'post', 'post_title', 'club', 'player', 'resume', 'certificates', 'status', 'created_at', 'cover_letter']
        read_only_fields = ['id', 'player', 'created_at']


class ClubMemberSerializer(serializers.ModelSerializer):
    player = UserSummarySerializer(read_only=True)
    club = UserSummarySerializer(read_only=True)

    class Meta:
        model = ClubMember
        fields = ['id', 'club', 'player', 'joined_at']
        read_only_fields = ['id', 'club', 'player', 'joined_at']


class MatchSerializer(serializers.ModelSerializer):
    home_team = UserSummarySerializer(read_only=True)
    away_team = UserSummarySerializer(read_only=True)
    tournament_name = serializers.CharField(source='tournament.name', read_only=True)

    class Meta:
        model = Match
        fields = [
            'id', 'tournament', 'tournament_name',
            'home_team', 'away_team',
            'match_date', 'home_score', 'away_score', 'is_completed'
        ]
        read_only_fields = ['id', 'tournament']


class TournamentSerializer(serializers.ModelSerializer):
    creator = UserSummarySerializer(read_only=True)
    registered_teams = UserSummarySerializer(many=True, read_only=True)
    is_registered = serializers.SerializerMethodField()
    is_creator = serializers.SerializerMethodField()
    matches = MatchSerializer(many=True, read_only=True)
    standings = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            'id', 'creator', 'name', 'sport', 'venue',
            'description', 'start_date', 'end_date', 'created_at',
            'registered_teams', 'is_registered', 'is_creator', 'matches', 'standings'
        ]
        read_only_fields = ['id', 'creator', 'created_at']

    def get_is_registered(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.registered_teams.filter(id=request.user.id).exists()
        return False

    def get_is_creator(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.creator == request.user or request.user.is_superuser
        return False

    def get_standings(self, obj):
        registered = obj.registered_teams.all()
        teams_stats = {}
        request = self.context.get('request')
        for team in registered:
            teams_stats[team.id] = {
                'team': UserSummarySerializer(team, context={'request': request}).data,
                'played': 0,
                'won': 0,
                'drawn': 0,
                'lost': 0,
                'goals_for': 0,
                'goals_against': 0,
                'points': 0,
            }

        matches = obj.matches.filter(is_completed=True)
        for match in matches:
            if match.home_score is not None and match.away_score is not None:
                h_id = match.home_team_id
                a_id = match.away_team_id

                if h_id not in teams_stats:
                    teams_stats[h_id] = {
                        'team': UserSummarySerializer(match.home_team, context={'request': request}).data,
                        'played': 0, 'won': 0, 'drawn': 0, 'lost': 0, 'goals_for': 0, 'goals_against': 0, 'points': 0
                    }
                if a_id not in teams_stats:
                    teams_stats[a_id] = {
                        'team': UserSummarySerializer(match.away_team, context={'request': request}).data,
                        'played': 0, 'won': 0, 'drawn': 0, 'lost': 0, 'goals_for': 0, 'goals_against': 0, 'points': 0
                    }

                teams_stats[h_id]['played'] += 1
                teams_stats[a_id]['played'] += 1
                teams_stats[h_id]['goals_for'] += match.home_score
                teams_stats[h_id]['goals_against'] += match.away_score
                teams_stats[a_id]['goals_for'] += match.away_score
                teams_stats[a_id]['goals_against'] += match.home_score

                if match.home_score > match.away_score:
                    teams_stats[h_id]['won'] += 1
                    teams_stats[h_id]['points'] += 3
                    teams_stats[a_id]['lost'] += 1
                elif match.home_score < match.away_score:
                    teams_stats[a_id]['won'] += 1
                    teams_stats[a_id]['points'] += 3
                    teams_stats[h_id]['lost'] += 1
                else:
                    teams_stats[h_id]['drawn'] += 1
                    teams_stats[h_id]['points'] += 1
                    teams_stats[a_id]['drawn'] += 1
                    teams_stats[a_id]['points'] += 1

        standings_list = list(teams_stats.values())
        standings_list.sort(key=lambda x: (x['points'], x['goals_for']), reverse=True)
        return standings_list


class SponsorshipOpportunitySerializer(serializers.ModelSerializer):
    sponsor = UserSummarySerializer(read_only=True)
    applications_count = serializers.SerializerMethodField()
    is_applied = serializers.SerializerMethodField()
    my_application_status = serializers.SerializerMethodField()
    sport = serializers.CharField(write_only=True, required=False, allow_blank=True)
    amount = serializers.CharField(write_only=True, required=False, allow_blank=True)
    sport_category = serializers.CharField(required=False, allow_blank=True)
    budget = serializers.CharField(required=False, allow_blank=True)
    eligibility = serializers.CharField(required=False, allow_blank=True, default='Open to all eligible athletes')

    class Meta:
        model = SponsorshipOpportunity
        fields = [
            'id', 'sponsor', 'title', 'sport_category', 'budget',
            'description', 'eligibility', 'created_at',
            'applications_count', 'is_applied', 'my_application_status',
            'sport', 'amount'
        ]
        read_only_fields = ['id', 'sponsor', 'created_at']

    def create(self, validated_data):
        sport = validated_data.pop('sport', None)
        if sport and not validated_data.get('sport_category'):
            validated_data['sport_category'] = sport
        amount = validated_data.pop('amount', None)
        if amount and not validated_data.get('budget'):
            validated_data['budget'] = amount
        if not validated_data.get('eligibility'):
            validated_data['eligibility'] = 'All verified athletes'
        if not validated_data.get('sport_category'):
            validated_data['sport_category'] = 'All Sports'
        if not validated_data.get('budget'):
            validated_data['budget'] = 'Negotiable'
        return super().create(validated_data)

    def get_applications_count(self, obj):
        return obj.applications.count()

    def get_is_applied(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.applications.filter(player=request.user).exists()
        return False

    def get_my_application_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            app = obj.applications.filter(player=request.user).first()
            if app:
                return app.status
        return None


class SponsorshipApplicationSerializer(serializers.ModelSerializer):
    player = UserSummarySerializer(read_only=True)
    opportunity = SponsorshipOpportunitySerializer(read_only=True)
    opportunity_id = serializers.IntegerField(write_only=True, required=False)
    pitch_message = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = SponsorshipApplication
        fields = ['id', 'opportunity', 'opportunity_id', 'player', 'status', 'message', 'created_at', 'pitch_message']
        read_only_fields = ['id', 'player', 'created_at']

    def create(self, validated_data):
        pitch = validated_data.pop('pitch_message', None)
        if pitch and not validated_data.get('message'):
            validated_data['message'] = pitch
        return super().create(validated_data)


class ResumeExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeExperience
        fields = ['id', 'player', 'role', 'club_name', 'start_date', 'end_date', 'is_current', 'description']
        read_only_fields = ['id', 'player']


class ResumeAchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeAchievement
        fields = ['id', 'player', 'title', 'year', 'description']
        read_only_fields = ['id', 'player']


class ResumeCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeCertificate
        fields = ['id', 'player', 'name', 'authority', 'issue_date', 'credential_id']
        read_only_fields = ['id', 'player']


class ResumeStatisticSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeStatistic
        fields = ['id', 'player', 'name', 'value', 'season']
        read_only_fields = ['id', 'player']


class EndorsementSerializer(serializers.ModelSerializer):
    coach = UserSummarySerializer(read_only=True)

    class Meta:
        model = Endorsement
        fields = ['id', 'player', 'coach', 'category', 'created_at']
        read_only_fields = ['id', 'coach', 'created_at']


class RecommendationSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)

    class Meta:
        model = Recommendation
        fields = ['id', 'player', 'author', 'relationship', 'content', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']


class BlogSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)
    featured_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = [
            'id', 'title', 'slug', 'short_description', 'content',
            'featured_image', 'featured_image_url', 'author', 'created_at', 'updated_at', 'is_published'
        ]
        read_only_fields = ['id', 'slug', 'author', 'created_at', 'updated_at']

    def get_featured_image_url(self, obj):
        if obj.featured_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url
        return None


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'subject', 'message', 'created_at', 'is_read']
        read_only_fields = ['id', 'created_at']


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_verified']
