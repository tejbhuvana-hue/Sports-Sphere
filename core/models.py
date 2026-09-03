from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

class User(AbstractUser):
    class Role(models.TextChoices):
        PLAYER = 'PLAYER', 'Player'
        COACH = 'COACH', 'Coach'
        CLUB = 'CLUB', 'Club'
        ASSOCIATION = 'ASSOCIATION', 'Association'
        SPONSOR = 'SPONSOR', 'Sponsor'
        SCOUT = 'SCOUT', 'Scout'
    
    role = models.CharField(
        max_length=20, 
        choices=Role.choices, 
        default=Role.PLAYER
    )
    following = models.ManyToManyField(
        'self',
        through='Follow',
        through_fields=('follower', 'following'),
        symmetrical=False,
        related_name='followers',
        blank=True
    )
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.username

class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='profile'
    )
    profile_picture = models.ImageField(upload_to='profiles/pictures/', blank=True, null=True)
    cover_banner = models.ImageField(upload_to='profiles/banners/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    is_online = models.BooleanField(default=False)
    
    # Player specific fields
    sport = models.CharField(max_length=100, blank=True, null=True)
    position = models.CharField(max_length=100, blank=True, null=True)
    achievements = models.TextField(blank=True, null=True)
    
    # Coach specific fields
    certifications = models.TextField(blank=True, null=True)
    experience = models.TextField(blank=True, null=True)
    
    # Club specific fields
    club_info = models.TextField(blank=True, null=True)
    
    # Association specific fields
    org_info = models.TextField(blank=True, null=True)
    
    # Sponsor specific fields
    company_name = models.CharField(max_length=200, blank=True, null=True)
    company_website = models.URLField(blank=True, null=True)
    company_industry = models.CharField(max_length=100, blank=True, null=True)
    company_profile = models.TextField(blank=True, null=True)
    
    # Scout specific fields
    recruitment_profile = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile ({self.user.role})"

class Post(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='posts'
    )
    content = models.TextField(blank=True)
    image = models.ImageField(upload_to='posts/images/', blank=True, null=True)
    video = models.FileField(upload_to='posts/videos/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    likes = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='liked_posts', 
        blank=True
    )
    saved_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='saved_posts', 
        blank=True
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Post by {self.author.username} at {self.created_at}"

    def total_likes(self):
        return self.likes.count()

class Comment(models.Model):
    post = models.ForeignKey(
        Post, 
        on_delete=models.CASCADE, 
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.username} on post {self.post.id}"

class Notification(models.Model):
    class NotificationType(models.TextChoices):
        LIKE = 'LIKE', 'Like'
        COMMENT = 'COMMENT', 'Comment'
        FOLLOW = 'FOLLOW', 'Follow'
        MESSAGE = 'MESSAGE', 'Message'
        SYSTEM = 'SYSTEM', 'System'
        
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='sent_notifications',
        null=True,
        blank=True
    )
    notification_type = models.CharField(
        max_length=20, 
        choices=NotificationType.choices
    )
    post = models.ForeignKey(
        Post, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True
    )
    is_read = models.BooleanField(default=False)
    content_preview = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.notification_type}"


class Message(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='received_messages'
    )
    content = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='chat/images/', blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"From {self.sender.username} to {self.receiver.username} at {self.timestamp}"


class Follow(models.Model):
    follower = models.ForeignKey(
        User,
        related_name='following_relationships',
        on_delete=models.CASCADE
    )
    following = models.ForeignKey(
        User,
        related_name='follower_relationships',
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(follower=models.F('following')),
                name='prevent_self_follow'
            )
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.follower == self.following:
            raise ValidationError("A user cannot follow themselves.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"



class RecruitmentPost(models.Model):
    club = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recruitment_posts'
    )
    title = models.CharField(max_length=200)
    sport = models.CharField(max_length=100)
    description = models.TextField()
    location = models.CharField(max_length=200)
    last_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} by {self.club.username}"


class Application(models.Model):
    class ApplicationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'

    post = models.ForeignKey(RecruitmentPost, on_delete=models.CASCADE, related_name='applications')
    player = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applications')
    resume = models.FileField(upload_to='resumes/')
    certificates = models.FileField(upload_to='certificates/', blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.player.username} applied to {self.post.title}"


class ClubMember(models.Model):
    club = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='club_members'
    )
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='club_memberships'
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('club', 'player')
        ordering = ['-joined_at']

    def __str__(self):
        return f"{self.player.username} in {self.club.username}"


class Tournament(models.Model):
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_tournaments'
    )
    name = models.CharField(max_length=200)
    sport = models.CharField(max_length=100)
    venue = models.CharField(max_length=200)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    registered_teams = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='registered_tournaments',
        blank=True
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Match(models.Model):
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.CASCADE,
        related_name='matches'
    )
    home_team = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='home_matches'
    )
    away_team = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='away_matches'
    )
    match_date = models.DateTimeField()
    home_score = models.IntegerField(null=True, blank=True)
    away_score = models.IntegerField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)

    class Meta:
        ordering = ['match_date']

    def __str__(self):
        return f"{self.home_team.username} vs {self.away_team.username} ({self.tournament.name})"


class SponsorshipOpportunity(models.Model):
    sponsor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sponsorships'
    )
    title = models.CharField(max_length=200)
    sport_category = models.CharField(max_length=100)
    budget = models.CharField(max_length=100)
    description = models.TextField()
    eligibility = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} by {self.sponsor.username}"


class SponsorshipApplication(models.Model):
    class ApplicationStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'

    opportunity = models.ForeignKey(
        SponsorshipOpportunity,
        on_delete=models.CASCADE,
        related_name='applications'
    )
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sponsorship_applications'
    )
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.PENDING
    )
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('opportunity', 'player')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.player.username} applied to {self.opportunity.title}"


class ResumeExperience(models.Model):
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='resume_experiences'
    )
    role = models.CharField(max_length=150)
    club_name = models.CharField(max_length=150)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.role} at {self.club_name} ({self.player.username})"


class ResumeAchievement(models.Model):
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='resume_achievements'
    )
    title = models.CharField(max_length=200)
    year = models.IntegerField()
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['-year']

    def __str__(self):
        return f"{self.title} ({self.year}) - {self.player.username}"


class ResumeCertificate(models.Model):
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='resume_certificates'
    )
    name = models.CharField(max_length=200)
    authority = models.CharField(max_length=200)
    issue_date = models.DateField()
    credential_id = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-issue_date']

    def __str__(self):
        return f"{self.name} by {self.authority} ({self.player.username})"


class ResumeStatistic(models.Model):
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='resume_statistics'
    )
    name = models.CharField(max_length=100, help_text="e.g. Goals, Assists, Clean Sheets")
    value = models.CharField(max_length=50)
    season = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ['-season', 'name']

    def __str__(self):
        return f"{self.name}: {self.value} ({self.season}) - {self.player.username}"


class Endorsement(models.Model):
    class Category(models.TextChoices):
        LEADERSHIP = 'LEADERSHIP', 'Leadership'
        TEAMWORK = 'TEAMWORK', 'Teamwork'
        FITNESS = 'FITNESS', 'Fitness'
        SKILLS = 'SKILLS', 'Skills'

    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='endorsements'
    )
    coach = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='given_endorsements'
    )
    category = models.CharField(
        max_length=20,
        choices=Category.choices
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('player', 'coach', 'category')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.coach.username} endorsed {self.player.username} for {self.category}"


class Recommendation(models.Model):
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recommendations'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='written_recommendations'
    )
    relationship = models.CharField(
        max_length=100,
        help_text="e.g. Head Coach, Academy Director"
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Rec for {self.player.username} by {self.author.username}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # Ensure profile exists before saving
    if not hasattr(instance, 'profile'):
        Profile.objects.create(user=instance)
    instance.profile.save()

@receiver(post_save, sender=Notification)
def trigger_realtime_notification(sender, instance, created, **kwargs):
    if created:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            sender_pic = '/static/images/default_avatar.png'
            if instance.sender and instance.sender.profile.profile_picture:
                sender_pic = instance.sender.profile.profile_picture.url
                
            # Compute a nice default message if content_preview is empty
            notif_message = ""
            if instance.notification_type == Notification.NotificationType.LIKE:
                notif_message = f"{instance.sender.username} liked your post."
            elif instance.notification_type == Notification.NotificationType.COMMENT:
                notif_message = f"{instance.sender.username} commented on your post."
            elif instance.notification_type == Notification.NotificationType.FOLLOW:
                notif_message = f"{instance.sender.username} started following you."
            elif instance.notification_type == Notification.NotificationType.MESSAGE:
                notif_message = f"New message from {instance.sender.username}: {instance.content_preview or ''}"
            else:
                notif_message = instance.content_preview or "You have a new update."

            async_to_sync(channel_layer.group_send)(
                f"user_{instance.recipient.id}",
                {
                    "type": "send_notification",
                    "notification_id": instance.id,
                    "sender": instance.sender.username if instance.sender else "System",
                    "sender_avatar": sender_pic,
                    "notification_type": instance.notification_type,
                    "post_id": instance.post.id if instance.post else None,
                    "is_read": instance.is_read,
                    "timestamp": "Just now",
                    "message": notif_message
                }
            )


class ContactMessage(models.Model):
    name = models.CharField(max_length=150)
    email = models.EmailField()
    subject = models.CharField(max_length=250)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subject} - {self.name} ({self.email})"


class Blog(models.Model):
    title = models.CharField(max_length=250)
    slug = models.SlugField(max_length=250, unique=True, blank=True)
    short_description = models.TextField(max_length=500, blank=True)
    content = models.TextField()
    featured_image = models.ImageField(upload_to='blogs/images/', blank=True, null=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='blogs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.title) or 'blog'
            slug = base_slug
            counter = 1
            while Blog.objects.filter(slug=slug).exclude(id=self.id).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        status = "Published" if self.is_published else "Draft"
        return f"{self.title} ({status})"


class Story(models.Model):
    class StoryType(models.TextChoices):
        IMAGE = 'IMAGE', 'Image'
        VIDEO = 'VIDEO', 'Video'
        TEXT = 'TEXT', 'Text'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='stories'
    )
    media = models.FileField(
        upload_to='stories/media/',
        blank=True,
        null=True
    )
    story_type = models.CharField(
        max_length=10,
        choices=StoryType.choices,
        default=StoryType.IMAGE
    )
    text_content = models.TextField(
        blank=True,
        null=True
    )
    background_style = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        default='linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['created_at']

    def save(self, *args, **kwargs):
        if not self.expires_at:
            from django.utils import timezone
            import datetime
            self.expires_at = timezone.now() + datetime.timedelta(hours=24)
        super().save(*args, **kwargs)

    @property
    def is_active(self):
        from django.utils import timezone
        if not self.expires_at:
            return False
        return self.expires_at > timezone.now()

    def __str__(self):
        return f"Story ({self.story_type}) by {self.user.username} at {self.created_at}"


class StoryView(models.Model):
    story = models.ForeignKey(
        Story,
        on_delete=models.CASCADE,
        related_name='views'
    )
    viewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='story_views'
    )
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-viewed_at']
        constraints = [
            models.UniqueConstraint(
                fields=['story', 'viewer'],
                name='unique_story_view'
            )
        ]

    def __str__(self):
        return f"{self.viewer.username} viewed story {self.story_id} at {self.viewed_at}"


class DeviceToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='device_tokens'
    )
    token = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['token'],
                name='unique_device_token'
            )
        ]

    def __str__(self):
        token_preview = self.token[:20] + '...' if len(self.token) > 20 else self.token
        return f"{self.user.username} - {token_preview}"



