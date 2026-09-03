import datetime
import io
import asyncio
from PIL import Image
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from .models import (
    Profile, Post, Comment, Notification, Message, Follow,
    RecruitmentPost, Application, ClubMember, Tournament, Match,
    SponsorshipOpportunity, SponsorshipApplication,
    ResumeExperience, ResumeAchievement, ResumeCertificate, ResumeStatistic,
    Endorsement, Recommendation, ContactMessage, Blog
)

User = get_user_model()


class SportsSphereModelTests(TestCase):
    def setUp(self):
        self.player_user = User.objects.create_user(
            username='TestPlayer',
            email='player@test.com',
            password='TestPassword123',
            role=User.Role.PLAYER
        )
        self.scout_user = User.objects.create_user(
            username='TestScout',
            email='scout@test.com',
            password='TestPassword123',
            role=User.Role.SCOUT
        )

    def test_profile_creation_signal(self):
        """Verify that a profile is automatically created when a User is registered."""
        self.assertIsNotNone(self.player_user.profile)
        self.assertEqual(self.player_user.profile.user, self.player_user)
        self.assertEqual(self.player_user.role, User.Role.PLAYER)

    def test_follow_system(self):
        """Test follow/unfollow actions between users."""
        self.scout_user.following.add(self.player_user)
        self.assertTrue(self.scout_user.following.filter(id=self.player_user.id).exists())
        self.assertTrue(self.player_user.followers.filter(id=self.scout_user.id).exists())

        # Unfollow
        self.scout_user.following.remove(self.player_user)
        self.assertFalse(self.scout_user.following.filter(id=self.player_user.id).exists())

    def test_post_creation_and_liking(self):
        """Test post creation and liking mechanics."""
        post = Post.objects.create(
            author=self.player_user,
            content="Testing my training update!"
        )
        self.assertEqual(post.author, self.player_user)
        self.assertEqual(post.total_likes(), 0)

        # Scout likes post
        post.likes.add(self.scout_user)
        self.assertEqual(post.total_likes(), 1)
        self.assertTrue(post.likes.filter(id=self.scout_user.id).exists())

    def test_commenting(self):
        """Test comments logic."""
        post = Post.objects.create(
            author=self.player_user,
            content="Testing comments"
        )
        comment = Comment.objects.create(
            post=post,
            author=self.scout_user,
            content="Great work!"
        )
        self.assertEqual(comment.post, post)
        self.assertEqual(comment.author, self.scout_user)
        self.assertEqual(post.comments.count(), 1)

    def test_notification_triggers(self):
        """Test creating notifications for user actions."""
        post = Post.objects.create(
            author=self.player_user,
            content="Testing notifications"
        )
        notif = Notification.objects.create(
            recipient=self.player_user,
            sender=self.scout_user,
            notification_type=Notification.NotificationType.COMMENT,
            post=post
        )
        self.assertEqual(notif.recipient, self.player_user)
        self.assertEqual(notif.sender, self.scout_user)
        self.assertEqual(notif.notification_type, Notification.NotificationType.COMMENT)
        self.assertFalse(notif.is_read)

    def test_message_creation_and_receipts(self):
        """Test direct messaging model and read status logic."""
        msg = Message.objects.create(
            sender=self.scout_user,
            receiver=self.player_user,
            content="Hello TestPlayer!"
        )
        self.assertEqual(msg.sender, self.scout_user)
        self.assertEqual(msg.receiver, self.player_user)
        self.assertEqual(msg.content, "Hello TestPlayer!")
        self.assertFalse(msg.is_read)

        msg.is_read = True
        msg.save()
        msg.refresh_from_db()
        self.assertTrue(msg.is_read)

    def test_follow_model_and_stats(self):
        """Test concrete Follow model creation and counts."""
        self.assertEqual(Follow.objects.filter(follower=self.scout_user).count(), 0)
        self.assertEqual(Follow.objects.filter(following=self.player_user).count(), 0)

        follow = Follow.objects.create(follower=self.scout_user, following=self.player_user)
        self.assertTrue(Follow.objects.filter(follower=self.scout_user, following=self.player_user).exists())

        follow.delete()
        self.assertFalse(Follow.objects.filter(follower=self.scout_user, following=self.player_user).exists())


class SportsSphereAsyncTests(TransactionTestCase):
    def setUp(self):
        self.player_user = User.objects.create_user(
            username='TestPlayerAsync',
            email='player_async@test.com',
            password='TestPassword123',
            role=User.Role.PLAYER
        )
        self.scout_user = User.objects.create_user(
            username='TestScoutAsync',
            email='scout_async@test.com',
            password='TestPassword123',
            role=User.Role.SCOUT
        )

    def test_websocket_notification_consumer(self):
        """Verify connecting to the notification consumer over Websockets."""
        from channels.testing import WebsocketCommunicator
        from sports_sphere.asgi import application

        async def run_ws_test():
            communicator = WebsocketCommunicator(application, "/ws/notifications/")
            communicator.scope['user'] = self.player_user
            connected, subprotocol = await communicator.connect()
            self.assertTrue(connected)
            await communicator.disconnect()

        asyncio.run(run_ws_test())

    def test_websocket_chat_consumer(self):
        """Verify WebSocket direct message sending/receiving via ChatConsumer."""
        from channels.testing import WebsocketCommunicator
        from sports_sphere.asgi import application

        async def run_ws_test():
            communicator = WebsocketCommunicator(application, f"/ws/chat/{self.scout_user.username}/")
            communicator.scope['user'] = self.player_user
            communicator.scope['url_route'] = {
                'kwargs': {'username': self.scout_user.username}
            }
            connected, subprotocol = await communicator.connect()
            self.assertTrue(connected)

            # Consume initial broadcasts (user_status and read_receipt)
            resp_status = await communicator.receive_json_from()
            resp_read = await communicator.receive_json_from()

            # Send message to consumer
            await communicator.send_json_to({
                "type": "message",
                "message": "Hello via websocket!"
            })

            # Receive message back from consumer broadcast
            response = await communicator.receive_json_from()
            self.assertEqual(response['type'], 'message')
            self.assertEqual(response['data']['content'], "Hello via websocket!")
            self.assertEqual(response['data']['sender'], self.player_user.username)

            await communicator.disconnect()

        asyncio.run(run_ws_test())


class SportsSphereRecruitmentTests(TestCase):
    def setUp(self):
        self.club_user = User.objects.create_user(
            username='TestClub',
            email='club@test.com',
            password='TestPassword123',
            role=User.Role.CLUB
        )
        self.player_user = User.objects.create_user(
            username='TestPlayer',
            email='player@test.com',
            password='TestPassword123',
            role=User.Role.PLAYER
        )
        self.post = RecruitmentPost.objects.create(
            club=self.club_user,
            title="U19 Striker",
            sport="Soccer",
            location="Houston, TX",
            last_date=datetime.date(2026, 7, 30),
            description="Agile center forward"
        )

    def test_recruitment_post_crud(self):
        """Test creating, editing, and deleting recruitment listings by clubs."""
        new_post = RecruitmentPost.objects.create(
            club=self.club_user,
            title='New Coach Position',
            sport='Basketball',
            location='Chicago, IL',
            last_date=datetime.date(2026, 8, 15),
            description='Head coach for youth team'
        )
        self.assertTrue(RecruitmentPost.objects.filter(title='New Coach Position').exists())

        new_post.title = 'Updated Coach Position'
        new_post.save()
        new_post.refresh_from_db()
        self.assertEqual(new_post.title, 'Updated Coach Position')

        new_post.delete()
        self.assertFalse(RecruitmentPost.objects.filter(title='Updated Coach Position').exists())

    def test_player_application_and_status(self):
        """Test player application submittals and club application status workflow."""
        resume_file = SimpleUploadedFile("resume.pdf", b"Mock PDF Resume content", content_type="application/pdf")
        app = Application.objects.create(
            post=self.post,
            player=self.player_user,
            resume=resume_file,
            status=Application.ApplicationStatus.PENDING
        )
        self.assertTrue(Application.objects.filter(post=self.post, player=self.player_user).exists())
        self.assertEqual(app.status, Application.ApplicationStatus.PENDING)

        app.status = Application.ApplicationStatus.ACCEPTED
        app.save()
        ClubMember.objects.create(club=self.club_user, player=self.player_user)

        self.assertTrue(ClubMember.objects.filter(club=self.club_user, player=self.player_user).exists())


class SportsSphereTournamentTests(TestCase):
    def setUp(self):
        self.club_creator = User.objects.create_user(
            username='ClubCreator',
            email='club_creator@test.com',
            password='TestPassword123',
            role=User.Role.CLUB
        )
        self.assoc_creator = User.objects.create_user(
            username='AssocCreator',
            email='assoc_creator@test.com',
            password='TestPassword123',
            role=User.Role.ASSOCIATION
        )
        self.club_team1 = User.objects.create_user(
            username='ClubTeam1',
            email='team1@test.com',
            password='TestPassword123',
            role=User.Role.CLUB
        )
        self.club_team2 = User.objects.create_user(
            username='ClubTeam2',
            email='team2@test.com',
            password='TestPassword123',
            role=User.Role.CLUB
        )
        self.tournament = Tournament.objects.create(
            creator=self.assoc_creator,
            name="Test Championship",
            sport="Soccer",
            venue="Arena A",
            description="Championship tournament",
            start_date=datetime.date(2026, 6, 20),
            end_date=datetime.date(2026, 6, 25)
        )

    def test_team_registration(self):
        """Test tournament team registration process."""
        self.tournament.registered_teams.add(self.club_team1)
        self.assertTrue(self.tournament.registered_teams.filter(id=self.club_team1.id).exists())

    def test_fixtures_and_matches(self):
        """Test tournament match generation and scores."""
        self.tournament.registered_teams.add(self.club_team1, self.club_team2)
        match = Match.objects.create(
            tournament=self.tournament,
            home_team=self.club_team1,
            away_team=self.club_team2,
            match_date=timezone.now(),
            home_score=3,
            away_score=1,
            is_completed=True
        )
        self.assertEqual(self.tournament.matches.count(), 1)
        self.assertTrue(match.is_completed)
        self.assertEqual(match.home_score, 3)


class SportsSphereSponsorshipTests(TestCase):
    def setUp(self):
        self.sponsor_user = User.objects.create_user(
            username='TestSponsor',
            email='sponsor@test.com',
            password='TestPassword123',
            role=User.Role.SPONSOR
        )
        self.player_user = User.objects.create_user(
            username='TestPlayer',
            email='player@test.com',
            password='TestPassword123',
            role=User.Role.PLAYER
        )
        self.opp = SponsorshipOpportunity.objects.create(
            sponsor=self.sponsor_user,
            title="Puma Ambassador",
            sport_category="Tennis",
            budget="$800 / month",
            description="Ambassador program",
            eligibility="U18 champions"
        )

    def test_sponsorship_application_flow(self):
        """Test player sponsorship application and status updates."""
        app = SponsorshipApplication.objects.create(
            opportunity=self.opp,
            player=self.player_user,
            message='I am a tennis champion, ready to pitch.',
            status=SponsorshipApplication.ApplicationStatus.PENDING
        )
        self.assertTrue(SponsorshipApplication.objects.filter(opportunity=self.opp, player=self.player_user).exists())

        app.status = SponsorshipApplication.ApplicationStatus.ACCEPTED
        app.save()
        app.refresh_from_db()
        self.assertEqual(app.status, SponsorshipApplication.ApplicationStatus.ACCEPTED)

    def test_resume_crud_player(self):
        """Test player adding and deleting items from their resume."""
        exp = ResumeExperience.objects.create(
            player=self.player_user,
            role='Left Wing',
            club_name='Test Youth Academy',
            start_date=datetime.date(2024, 1, 1),
            end_date=datetime.date(2025, 1, 1),
            is_current=False,
            description='Scored many goals'
        )
        self.assertTrue(ResumeExperience.objects.filter(role='Left Wing', player=self.player_user).exists())

        exp.delete()
        self.assertFalse(ResumeExperience.objects.filter(id=exp.id).exists())

    def test_endorsements_and_recommendations(self):
        """Test endorsements and recommendations creation."""
        coach_user = User.objects.create_user(
            username='TestCoach',
            email='coach@test.com',
            password='TestPassword123',
            role=User.Role.COACH
        )
        endorsement = Endorsement.objects.create(
            player=self.player_user,
            coach=coach_user,
            category=Endorsement.Category.SKILLS
        )
        self.assertTrue(Endorsement.objects.filter(player=self.player_user, coach=coach_user).exists())

        rec = Recommendation.objects.create(
            player=self.player_user,
            author=coach_user,
            relationship='Head Coach',
            content='Outstanding work ethic.'
        )
        self.assertTrue(Recommendation.objects.filter(player=self.player_user, author=coach_user).exists())


class SportsSphereFeedbackAndBlogTests(TestCase):
    def test_contact_message_creation(self):
        """Verify contact message creation."""
        msg = ContactMessage.objects.create(
            name='John Doe',
            email='johndoe@example.com',
            subject='Sponsorship inquiry',
            message='Hello, I want to inquire about sponsorships on SportsSphere.'
        )
        self.assertTrue(ContactMessage.objects.filter(email='johndoe@example.com').exists())
        self.assertFalse(msg.is_read)

    def test_blog_model_and_slug_generation(self):
        """Test Blog model auto-slug creation and unique slug handling."""
        admin_user = User.objects.create_superuser(
            username='admin_test',
            email='admin@test.com',
            password='AdminPassword123'
        )
        blog1 = Blog.objects.create(
            title="Football Training Innovations 2026",
            content="Modern conditioning methods for athletes.",
            author=admin_user,
            is_published=True
        )
        self.assertEqual(blog1.slug, "football-training-innovations-2026")

        blog2 = Blog.objects.create(
            title="Football Training Innovations 2026",
            content="Second article with same title.",
            author=admin_user,
            is_published=False
        )
        self.assertTrue(blog2.slug.startswith("football-training-innovations-2026-"))
        self.assertNotEqual(blog1.slug, blog2.slug)
