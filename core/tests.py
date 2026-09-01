import io
import asyncio
from PIL import Image
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import Profile, Post, Comment, Notification, Message, RecruitmentPost, Application, ClubMember, Tournament, Match, SponsorshipOpportunity, SponsorshipApplication, ResumeExperience, ResumeAchievement, ResumeCertificate, ResumeStatistic, Endorsement, Recommendation, Follow

User = get_user_model()

class SportsSphereTests(TestCase):
    def setUp(self):
        # Create a player user
        self.player_user = User.objects.create_user(
            username='TestPlayer',
            email='player@test.com',
            password='TestPassword123',
            role=User.Role.PLAYER
        )
        # Create a scout user
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
        # Scout follows Player
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
        # Create a comment notification
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
        """Test direct messaging model and views read status logic."""
        msg = Message.objects.create(
            sender=self.scout_user,
            receiver=self.player_user,
            content="Hello TestPlayer!"
        )
        self.assertEqual(msg.sender, self.scout_user)
        self.assertEqual(msg.receiver, self.player_user)
        self.assertEqual(msg.content, "Hello TestPlayer!")
        self.assertFalse(msg.is_read)

        # Renders the message page and updates the read receipt
        self.client.login(username='TestPlayer', password='TestPassword123')
        response = self.client.get(f'/messages/{self.scout_user.username}/')
        self.assertEqual(response.status_code, 200)
        
        # Verify message has been marked as read in view
        msg.refresh_from_db()
        self.assertTrue(msg.is_read)

    def test_follow_model_and_stats(self):
        """Test concrete Follow model creation, counts, and lists views."""
        # Check counts initially
        self.assertEqual(Follow.objects.filter(follower=self.scout_user).count(), 0)
        self.assertEqual(Follow.objects.filter(following=self.player_user).count(), 0)

        # Follow via endpoint
        self.client.login(username='TestScout', password='TestPassword123')
        response = self.client.post(f'/user/{self.player_user.id}/follow/')
        self.assertEqual(response.status_code, 302) # standard redirect

        # Verify database record exists
        self.assertTrue(Follow.objects.filter(follower=self.scout_user, following=self.player_user).exists())

        # Verify list views
        response = self.client.get(f'/followers/{self.player_user.username}/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'TestScout')

        response = self.client.get(f'/following/{self.scout_user.username}/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'TestPlayer')

        # Unfollow via endpoint
        response = self.client.post(f'/user/{self.player_user.id}/follow/')
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Follow.objects.filter(follower=self.scout_user, following=self.player_user).exists())

    def test_upload_chat_image(self):
        """Test REST API endpoint for uploading chat images."""
        self.client.login(username='TestPlayer', password='TestPassword123')
        
        # Create a tiny PNG image in memory
        file = io.BytesIO()
        image = Image.new('RGB', size=(10, 10), color=(0, 217, 255))
        image.save(file, 'png')
        file.name = 'test_chat_upload.png'
        file.seek(0)
        
        uploaded_file = SimpleUploadedFile(file.name, file.read(), content_type='image/png')
        response = self.client.post('/chat/upload/', {'image': uploaded_file})
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn('image_url', data)
        self.assertTrue(data['image_url'].startswith('/media/chat/images/test_chat_upload'))

    def test_search_view(self):
        """Test global search with query matching and role, sport, location filters."""
        self.client.login(username='TestPlayer', password='TestPassword123')
        # Create some profiles with specific sport, location, role
        user1 = User.objects.create_user(username='SearchCoach', password='Password123', role=User.Role.COACH)
        user1.profile.sport = 'Basketball'
        user1.profile.location = 'Denver, CO'
        user1.profile.bio = 'Experienced basketball coach.'
        user1.profile.save()

        user2 = User.objects.create_user(username='SearchPlayer', password='Password123', role=User.Role.PLAYER)
        user2.profile.sport = 'Soccer'
        user2.profile.location = 'Miami, FL'
        user2.profile.bio = 'Soccer striker looking for team.'
        user2.profile.save()
        
        post = Post.objects.create(author=user2, content="Amazing day playing soccer!")

        # 1. Search with q
        response = self.client.get('/search/', {'q': 'striker'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'SearchPlayer')

        # 2. Search with role
        response = self.client.get('/search/', {'role': 'COACH'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'SearchCoach')
        self.assertNotContains(response, 'SearchPlayer')

        # 3. Search with sport
        response = self.client.get('/search/', {'sport': 'Soccer'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'SearchPlayer')
        self.assertNotContains(response, 'SearchCoach')

        # 4. Search with location
        response = self.client.get('/search/', {'location': 'Denver'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'SearchCoach')
        self.assertNotContains(response, 'SearchPlayer')

    def test_suggestions_scoring(self):
        """Test profile suggestions scoring system."""
        # Set TestPlayer sport
        self.player_user.profile.sport = 'Soccer'
        self.player_user.profile.save()

        # Follow TestScout so they don't appear in feed view suggestions
        self.scout_user.followers.add(self.player_user)

        # User A: Coach, Soccer, no followers, no posts (score: 10 + 0 + 0 = 10)
        user_a = User.objects.create_user(username='UserA', password='Password123', role=User.Role.COACH)
        user_a.profile.sport = 'Soccer'
        user_a.profile.save()

        # User B: Player, Basketball, no followers, no posts (score: 0 + 0 + 0 = 0)
        user_b = User.objects.create_user(username='UserB', password='Password123', role=User.Role.PLAYER)
        user_b.profile.sport = 'Basketball'
        user_b.profile.save()

        # User C: Player, Soccer, 2 followers, no posts (score: 10 + 2 + 0 = 12)
        user_c = User.objects.create_user(username='UserC', password='Password123', role=User.Role.PLAYER)
        user_c.profile.sport = 'Soccer'
        user_c.profile.save()
        user_c.followers.add(user_a)
        user_c.followers.add(user_b)

        # User D: Player, Soccer, 1 follower, 1 post (score: 10 + 1 + 5 = 16)
        user_d = User.objects.create_user(username='UserD', password='Password123', role=User.Role.PLAYER)
        user_d.profile.sport = 'Soccer'
        user_d.profile.save()
        user_d.followers.add(user_a)
        Post.objects.create(author=user_d, content="UserD test post")

        # Run the feed view and check scored suggestions order
        self.client.login(username='TestPlayer', password='TestPassword123')
        response = self.client.get('/feed/')
        self.assertEqual(response.status_code, 200)
        
        suggested_profiles = response.context['suggested_profiles']
        # The scoring ranks: UserD (16), UserC (12), UserA (10), UserB (0)
        # Note: suggested_profiles limits to top 4, excluding request.user and already followed users.
        self.assertEqual(suggested_profiles[0], user_d)
        self.assertEqual(suggested_profiles[1], user_c)
        self.assertEqual(suggested_profiles[2], user_a)
        self.assertEqual(suggested_profiles[3], user_b)


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
        import datetime
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
        self.client.login(username='TestClub', password='TestPassword123')
        
        # 1. Create recruitment listing
        response = self.client.post('/club/recruitment/create/', {
            'title': 'New Coach Position',
            'sport': 'Basketball',
            'location': 'Chicago, IL',
            'last_date': '2026-08-15',
            'description': 'Head coach for youth team'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(RecruitmentPost.objects.filter(title='New Coach Position').exists())
        
        new_post = RecruitmentPost.objects.get(title='New Coach Position')
        
        # 2. Edit listing
        response = self.client.post(f'/club/recruitment/{new_post.id}/edit/', {
            'title': 'Updated Coach Position',
            'sport': 'Basketball',
            'location': 'Chicago, IL',
            'last_date': '2026-08-20',
            'description': 'Updated description'
        })
        self.assertEqual(response.status_code, 302)
        new_post.refresh_from_db()
        self.assertEqual(new_post.title, 'Updated Coach Position')
        self.assertEqual(new_post.last_date.strftime('%Y-%m-%d'), '2026-08-20')

        # 3. Delete listing
        response = self.client.post(f'/club/recruitment/{new_post.id}/delete/')
        self.assertEqual(response.status_code, 302)
        self.assertFalse(RecruitmentPost.objects.filter(title='Updated Coach Position').exists())

    def test_player_application_and_status(self):
        """Test player application submittals and club dashboard status update workflow."""
        self.client.login(username='TestPlayer', password='TestPassword123')
        
        # Create mock resume and cert files
        resume_file = SimpleUploadedFile("resume.pdf", b"Mock PDF Resume content", content_type="application/pdf")
        cert_file = SimpleUploadedFile("cert.jpg", b"Mock Image Content", content_type="image/jpeg")
        
        # Submit application
        response = self.client.post(f'/recruitment/apply/{self.post.id}/', {
            'resume': resume_file,
            'certificates': cert_file
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Application.objects.filter(post=self.post, player=self.player_user).exists())
        
        app = Application.objects.get(post=self.post, player=self.player_user)
        self.assertEqual(app.status, 'PENDING')
        self.assertIsNotNone(app.resume)
        
        # Assert system notification is sent to Club
        self.assertTrue(Notification.objects.filter(recipient=self.club_user, sender=self.player_user).exists())

        # Log in as Club and accept the application
        self.client.login(username='TestClub', password='TestPassword123')
        response = self.client.post(f'/club/application/{app.id}/status/', {
            'status': 'ACCEPTED'
        })
        self.assertEqual(response.status_code, 302)
        app.refresh_from_db()
        self.assertEqual(app.status, 'ACCEPTED')
        
        # Verify automatic addition to club members roster
        self.assertTrue(ClubMember.objects.filter(club=self.club_user, player=self.player_user).exists())
        
        # Verify notification sent back to player
        self.assertTrue(Notification.objects.filter(recipient=self.player_user, sender=self.club_user).exists())

    def test_manual_member_add_and_remove(self):
        """Test manually registering and removing teammates from the club roster."""
        self.client.login(username='TestClub', password='TestPassword123')
        
        # Add player manually
        response = self.client.post('/club/members/add/', {
            'player_id': self.player_user.id
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(ClubMember.objects.filter(club=self.club_user, player=self.player_user).exists())
        
        member = ClubMember.objects.get(club=self.club_user, player=self.player_user)
        
        # Remove player manually
        response = self.client.post(f'/club/members/{member.id}/remove/')
        self.assertEqual(response.status_code, 302)
        self.assertFalse(ClubMember.objects.filter(club=self.club_user, player=self.player_user).exists())

    def test_recruitment_access_controls(self):
        """Test security access restrictions on dashboard and applying."""
        # 1. Player cannot access Club Dashboard
        self.client.login(username='TestPlayer', password='TestPassword123')
        response = self.client.get('/club/dashboard/')
        self.assertEqual(response.status_code, 302) # Redirects to feed
        
        # 2. Club cannot apply to listings
        self.client.login(username='TestClub', password='TestPassword123')
        response = self.client.post(f'/recruitment/apply/{self.post.id}/', {
            'resume': SimpleUploadedFile("resume.pdf", b"content")
        })
        self.assertEqual(response.status_code, 302) # Redirects to recruitment page
        self.assertFalse(Application.objects.filter(post=self.post, player=self.club_user).exists())


class SportsSphereTournamentTests(TestCase):
    def setUp(self):
        import datetime
        # Creators
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
        # Registered teams (must be CLUB role)
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
        self.player_user = User.objects.create_user(
            username='PlayerUser',
            email='player@test.com',
            password='TestPassword123',
            role=User.Role.PLAYER
        )
        
        # An existing tournament
        self.tournament = Tournament.objects.create(
            creator=self.assoc_creator,
            name="Test Championship",
            sport="Soccer",
            venue="Arena A",
            description="Championship tournament",
            start_date=datetime.date(2026, 6, 20),
            end_date=datetime.date(2026, 6, 25)
        )

    def test_tournament_creation_access_controls(self):
        """Test that only club and association users can create a tournament."""
        # 1. Player cannot create
        self.client.login(username='PlayerUser', password='TestPassword123')
        response = self.client.post('/tournaments/create/', {
            'name': 'Player Cup',
            'sport': 'Soccer',
            'venue': 'Venue P',
            'start_date': '2026-06-20',
            'end_date': '2026-06-25',
            'description': 'Description'
        })
        self.assertEqual(response.status_code, 302) # Redirects (with error)
        self.assertFalse(Tournament.objects.filter(name='Player Cup').exists())

        # 2. Club can create
        self.client.login(username='ClubCreator', password='TestPassword123')
        response = self.client.post('/tournaments/create/', {
            'name': 'Club Cup',
            'sport': 'Basketball',
            'venue': 'Venue C',
            'start_date': '2026-07-01',
            'end_date': '2026-07-05',
            'description': 'Description'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Tournament.objects.filter(name='Club Cup').exists())
        
        # 3. Association can create
        self.client.login(username='AssocCreator', password='TestPassword123')
        response = self.client.post('/tournaments/create/', {
            'name': 'Assoc Cup',
            'sport': 'Tennis',
            'venue': 'Venue A',
            'start_date': '2026-08-01',
            'end_date': '2026-08-05',
            'description': 'Description'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Tournament.objects.filter(name='Assoc Cup').exists())

    def test_team_registration(self):
        """Test tournament team registration process and restrictions."""
        # 1. Player role cannot register
        self.client.login(username='PlayerUser', password='TestPassword123')
        response = self.client.post(f'/tournaments/{self.tournament.id}/register/')
        self.assertEqual(response.status_code, 302)
        self.assertFalse(self.tournament.registered_teams.filter(id=self.player_user.id).exists())

        # 2. Club role can register
        self.client.login(username='ClubTeam1', password='TestPassword123')
        response = self.client.post(f'/tournaments/{self.tournament.id}/register/')
        self.assertEqual(response.status_code, 302)
        self.assertTrue(self.tournament.registered_teams.filter(id=self.club_team1.id).exists())
        
        # Check system notification was sent to creator
        self.assertTrue(Notification.objects.filter(
            recipient=self.tournament.creator,
            sender=self.club_team1,
            notification_type=Notification.NotificationType.SYSTEM
        ).exists())

        # 3. Prevent/ignore duplicate registrations
        response = self.client.post(f'/tournaments/{self.tournament.id}/register/')
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.tournament.registered_teams.filter(id=self.club_team1.id).count(), 1)

    def test_fixtures_generation_and_interval(self):
        """Test round-robin fixtures generation and 1-day scheduling interval."""
        # Add teams to tournament
        self.tournament.registered_teams.add(self.club_team1, self.club_team2)
        
        # Non-creator trying to generate fixtures
        self.client.login(username='ClubTeam1', password='TestPassword123')
        response = self.client.post(f'/tournaments/{self.tournament.id}/fixtures/generate/')
        self.assertEqual(response.status_code, 404)
        self.assertFalse(self.tournament.matches.exists())

        # Creator generates fixtures
        self.client.login(username='AssocCreator', password='TestPassword123')
        response = self.client.post(f'/tournaments/{self.tournament.id}/fixtures/generate/')
        self.assertEqual(response.status_code, 302)
        
        # Verify pairings created: 2 teams => 1 match
        matches = self.tournament.matches.all()
        self.assertEqual(matches.count(), 1)
        match = matches.first()
        self.assertEqual(match.match_date.date(), self.tournament.start_date)
        
        # With 3 teams => 3 matches (comb(3, 2) = 3)
        import datetime
        t3 = Tournament.objects.create(
            creator=self.assoc_creator,
            name="3-Team Tourney",
            sport="Soccer",
            venue="Arena C",
            description="3 teams",
            start_date=datetime.date(2026, 7, 1),
            end_date=datetime.date(2026, 7, 10)
        )
        t3.registered_teams.add(self.club_team1, self.club_team2, self.club_creator)
        
        response = self.client.post(f'/tournaments/{t3.id}/fixtures/generate/')
        self.assertEqual(response.status_code, 302)
        
        matches_t3 = list(t3.matches.all().order_by('match_date'))
        self.assertEqual(len(matches_t3), 3)
        
        # Verify 1-day spacing intervals: 2026-07-01, 2026-07-02, 2026-07-03
        self.assertEqual(matches_t3[0].match_date.date(), datetime.date(2026, 7, 1))
        self.assertEqual(matches_t3[1].match_date.date(), datetime.date(2026, 7, 2))
        self.assertEqual(matches_t3[2].match_date.date(), datetime.date(2026, 7, 3))
        
        # Verify notifications sent to registered teams
        for team in [self.club_team1, self.club_team2, self.club_creator]:
            self.assertTrue(Notification.objects.filter(
                recipient=team,
                notification_type=Notification.NotificationType.SYSTEM,
                content_preview=f"Match fixtures generated for '{t3.name}'"
            ).exists())

    def test_scores_recording_and_standings(self):
        """Test scores recording and dynamic points standings computation."""
        self.tournament.registered_teams.add(self.club_team1, self.club_team2, self.club_creator)
        
        # Generate matches
        self.client.login(username='AssocCreator', password='TestPassword123')
        self.client.post(f'/tournaments/{self.tournament.id}/fixtures/generate/')
        
        matches = list(self.tournament.matches.all())
        m0 = matches[0]
        
        # Non-creator cannot update score
        self.client.login(username='ClubTeam1', password='TestPassword123')
        response = self.client.post(f'/tournaments/match/{m0.id}/update/', {
            'home_score': 3,
            'away_score': 1
        })
        self.assertEqual(response.status_code, 404)
        
        # Creator updates score
        self.client.login(username='AssocCreator', password='TestPassword123')
        response = self.client.post(f'/tournaments/match/{m0.id}/update/', {
            'home_score': 3,
            'away_score': 1
        })
        self.assertEqual(response.status_code, 302)
        
        m0.refresh_from_db()
        self.assertTrue(m0.is_completed)
        self.assertEqual(m0.home_score, 3)
        self.assertEqual(m0.away_score, 1)
        
        # Verify notifications sent to registered teams upon score updates
        for team in [self.club_team1, self.club_team2, self.club_creator]:
            self.assertTrue(Notification.objects.filter(
                recipient=team,
                notification_type=Notification.NotificationType.SYSTEM,
                content_preview__contains=f"Score Update in '{self.tournament.name}'"
            ).exists())

        # Now let's complete another match to test standings points calculation
        m1 = matches[1]
        self.client.post(f'/tournaments/match/{m1.id}/update/', {
            'home_score': 2,
            'away_score': 2
        })
        
        # Get tournament detail view to verify dynamic standings calculation
        self.client.login(username='ClubTeam1', password='TestPassword123')
        response = self.client.get(f'/tournaments/{self.tournament.id}/')
        self.assertEqual(response.status_code, 200)
        
        standings = response.context['standings']
        actual_pts = {}
        for item in standings:
            actual_pts[item['team'].username] = item['points']
            
        self.assertEqual(sum(actual_pts.values()), 5)


class SportsSphereSponsorshipTests(TestCase):
    def setUp(self):
        # Users
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
        self.scout_user = User.objects.create_user(
            username='TestScout',
            email='scout@test.com',
            password='TestPassword123',
            role=User.Role.SCOUT
        )
        
        # Existing Opportunity
        self.opp = SponsorshipOpportunity.objects.create(
            sponsor=self.sponsor_user,
            title="Puma Ambassador",
            sport_category="Tennis",
            budget="$800 / month",
            description="Ambassador program",
            eligibility="U18 champions"
        )

    def test_sponsor_profile_fields_save(self):
        """Test updating and saving sponsor specific profile fields."""
        self.client.login(username='TestSponsor', password='TestPassword123')
        # Simulate profile update post
        response = self.client.post('/profile/edit/', {
            'company_name': 'Puma Performance',
            'company_website': 'https://www.puma.com',
            'company_industry': 'Sports Apparel',
            'company_profile': 'Puma Brand details',
            'location': 'Herzogenaurach, Germany',
            'bio': 'Forever Faster.'
        })
        self.assertEqual(response.status_code, 302)
        
        self.sponsor_user.profile.refresh_from_db()
        self.assertEqual(self.sponsor_user.profile.company_name, 'Puma Performance')
        self.assertEqual(self.sponsor_user.profile.company_website, 'https://www.puma.com')
        self.assertEqual(self.sponsor_user.profile.company_industry, 'Sports Apparel')
        self.assertEqual(self.sponsor_user.profile.company_profile, 'Puma Brand details')

    def test_sponsorship_opportunity_hosting_controls(self):
        """Verify role restriction and validation for hosting sponsorship offers."""
        # 1. Player cannot create
        self.client.login(username='TestPlayer', password='TestPassword123')
        response = self.client.post('/sponsorships/create/', {
            'title': 'Illegal Offer',
            'sport_category': 'Soccer',
            'budget': '$1000',
            'description': 'Player attempting to host',
            'eligibility': 'None'
        })
        self.assertEqual(response.status_code, 302)
        self.assertFalse(SponsorshipOpportunity.objects.filter(title='Illegal Offer').exists())

        # 2. Sponsor can create
        self.client.login(username='TestSponsor', password='TestPassword123')
        response = self.client.post('/sponsorships/create/', {
            'title': 'Nike Brand Ambassador',
            'sport_category': 'Soccer',
            'budget': '$2000',
            'description': 'Valid campaign',
            'eligibility': 'Top players'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(SponsorshipOpportunity.objects.filter(title='Nike Brand Ambassador').exists())

    def test_sponsorship_application_flow(self):
        """Test player pitch submission and validation."""
        # 1. Non-player cannot apply (Sponsor cannot apply to their own/other offers)
        self.client.login(username='TestSponsor', password='TestPassword123')
        response = self.client.post(f'/sponsorships/{self.opp.id}/apply/', {
            'message': 'Sponsor attempting to pitch'
        })
        self.assertEqual(response.status_code, 302)
        self.assertFalse(SponsorshipApplication.objects.filter(opportunity=self.opp, player=self.sponsor_user).exists())

        # 2. Player can apply
        self.client.login(username='TestPlayer', password='TestPassword123')
        response = self.client.post(f'/sponsorships/{self.opp.id}/apply/', {
            'message': 'I am a tennis champion, ready to pitch.'
        })
        self.assertEqual(response.status_code, 302)
        
        self.assertTrue(SponsorshipApplication.objects.filter(opportunity=self.opp, player=self.player_user).exists())
        app = SponsorshipApplication.objects.get(opportunity=self.opp, player=self.player_user)
        self.assertEqual(app.status, 'PENDING')
        self.assertEqual(app.message, 'I am a tennis champion, ready to pitch.')
        
        # Verify notification sent to Sponsor
        self.assertTrue(Notification.objects.filter(
            recipient=self.sponsor_user,
            sender=self.player_user,
            notification_type=Notification.NotificationType.SYSTEM
        ).exists())

        # 3. Prevent duplicate applications
        response = self.client.post(f'/sponsorships/{self.opp.id}/apply/', {
            'message': 'Duplicate attempt'
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(SponsorshipApplication.objects.filter(opportunity=self.opp, player=self.player_user).count(), 1)

    def test_sponsor_dashboard_and_approval_workflow(self):
        """Test status approval/rejection updates on applicant pitches."""
        # Player applies
        app = SponsorshipApplication.objects.create(
            opportunity=self.opp,
            player=self.player_user,
            message="Tennis applicant pitch",
            status=SponsorshipApplication.ApplicationStatus.PENDING
        )
        
        # Check Sponsor Dashboard views
        self.client.login(username='TestSponsor', password='TestPassword123')
        response = self.client.get('/sponsorships/dashboard/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Tennis applicant pitch')
        
        # Sponsor accepts player pitch
        response = self.client.post(f'/sponsorships/application/{app.id}/status/', {
            'status': 'ACCEPTED'
        })
        self.assertEqual(response.status_code, 302)
        app.refresh_from_db()
        self.assertEqual(app.status, 'ACCEPTED')
        
        # Verify notification is sent to the Player
        self.assertTrue(Notification.objects.filter(
            recipient=self.player_user,
            sender=self.sponsor_user,
            notification_type=Notification.NotificationType.SYSTEM,
            content_preview__contains="accepted"
        ).exists())

    def test_user_verification_toggle(self):
        """Test toggling account verification status."""
        self.client.login(username='TestPlayer', password='TestPassword123')
        self.assertFalse(self.player_user.is_verified)
        
        response = self.client.get('/profile/verify/toggle/')
        self.assertEqual(response.status_code, 302)
        
        self.player_user.refresh_from_db()
        self.assertTrue(self.player_user.is_verified)
        
        # Toggle back
        response = self.client.get('/profile/verify/toggle/')
        self.assertEqual(response.status_code, 302)
        self.player_user.refresh_from_db()
        self.assertFalse(self.player_user.is_verified)

    def test_resume_crud_player(self):
        """Test player adding and deleting items from their resume."""
        self.client.login(username='TestPlayer', password='TestPassword123')
        
        # Add experience
        response = self.client.post('/profile/resume/add/experience/', {
            'role': 'Left Wing',
            'club_name': 'Test Youth Academy',
            'start_date': '2024-01-01',
            'end_date': '2025-01-01',
            'is_current': False,
            'description': 'Scored many goals'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(ResumeExperience.objects.filter(role='Left Wing', player=self.player_user).exists())
        exp = ResumeExperience.objects.get(role='Left Wing', player=self.player_user)

        # Non-owner cannot delete
        self.client.login(username='TestScout', password='TestPassword123')
        response = self.client.get(f'/profile/resume/delete/experience/{exp.id}/')
        self.assertEqual(response.status_code, 302)
        self.assertTrue(ResumeExperience.objects.filter(id=exp.id).exists())

        # Owner can delete
        self.client.login(username='TestPlayer', password='TestPassword123')
        response = self.client.get(f'/profile/resume/delete/experience/{exp.id}/')
        self.assertEqual(response.status_code, 302)
        self.assertFalse(ResumeExperience.objects.filter(id=exp.id).exists())

        # Add statistic
        response = self.client.post('/profile/resume/add/statistic/', {
            'name': 'Goals',
            'value': '45',
            'season': '2025/2026'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(ResumeStatistic.objects.filter(name='Goals', player=self.player_user).exists())

    def test_endorsements_coaches_only(self):
        """Test coaches endorsing players, unique constraint, non-coaches restricted."""
        coach_user = User.objects.create_user(
            username='TestCoach',
            email='coach@test.com',
            password='TestPassword123',
            role=User.Role.COACH
        )
        
        # 1. Non-coach attempts to endorse
        self.client.login(username='TestScout', password='TestPassword123')
        response = self.client.get(f'/profile/endorse/{self.player_user.id}/skills/')
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Endorsement.objects.filter(player=self.player_user).exists())

        # 2. Coach endorses player
        self.client.login(username='TestCoach', password='TestPassword123')
        response = self.client.get(f'/profile/endorse/{self.player_user.id}/skills/')
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Endorsement.objects.filter(player=self.player_user, coach=coach_user, category='SKILLS').exists())

        # 3. Coach toggles endorsement off
        response = self.client.get(f'/profile/endorse/{self.player_user.id}/skills/')
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Endorsement.objects.filter(player=self.player_user, coach=coach_user, category='SKILLS').exists())

    def test_recommendations_coaches_and_clubs(self):
        """Test recommendation creation and access controls."""
        coach_user = User.objects.create_user(
            username='TestCoachRec',
            email='coachrec@test.com',
            password='TestPassword123',
            role=User.Role.COACH
        )
        club_user = User.objects.create_user(
            username='TestClubRec',
            email='clubrec@test.com',
            password='TestPassword123',
            role=User.Role.CLUB
        )

        # 1. Scout attempts to write recommendation (should be blocked)
        self.client.login(username='TestScout', password='TestPassword123')
        response = self.client.post(f'/profile/recommend/{self.player_user.id}/', {
            'relationship': 'Observer',
            'content': 'Great athletic potential.'
        })
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Recommendation.objects.filter(player=self.player_user).exists())

        # 2. Coach writes recommendation (should succeed)
        self.client.login(username='TestCoachRec', password='TestPassword123')
        response = self.client.post(f'/profile/recommend/{self.player_user.id}/', {
            'relationship': 'Main Coach',
            'content': 'Outstanding discipline and field vision.'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Recommendation.objects.filter(player=self.player_user, author=coach_user).exists())
        rec = Recommendation.objects.get(player=self.player_user, author=coach_user)
        self.assertEqual(rec.relationship, 'Main Coach')
        self.assertEqual(rec.content, 'Outstanding discipline and field vision.')

        # 3. Club writes recommendation (should succeed)
        self.client.login(username='TestClubRec', password='TestPassword123')
        response = self.client.post(f'/profile/recommend/{self.player_user.id}/', {
            'relationship': 'Club Academy President',
            'content': 'Asset to our team pathways.'
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Recommendation.objects.filter(player=self.player_user, author=club_user).exists())


class SportsSphereLandingAndContactTests(TestCase):
    def setUp(self):
        self.player_user = User.objects.create_user(
            username='TestPlayer',
            email='player@test.com',
            password='TestPassword123',
            role=User.Role.PLAYER
        )

    def test_anonymous_visitor_views_landing_page(self):
        """Verify that root URL renders the landing page for unauthenticated users."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'landing.html')
        self.assertContains(response, "Where Athletes Connect, Grow, Compete and Get Discovered")

    def test_authenticated_user_redirects_to_feed(self):
        """Verify that authenticated users visiting root URL are redirected to the feed."""
        self.client.login(username='TestPlayer', password='TestPassword123')
        response = self.client.get('/')
        self.assertRedirects(response, '/feed/')

    def test_contact_page_get_anonymous(self):
        """Verify that unauthenticated visitors can view the contact page with an empty form."""
        response = self.client.get('/contact/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'contact.html')
        self.assertContains(response, 'Contact Information')
        self.assertContains(response, 'Send Us a Message')
        # Sidebar variables should not be populated for anonymous visitors
        self.assertNotIn('suggested_profiles', response.context)

    def test_contact_page_get_authenticated(self):
        """Verify that authenticated users view contact page with pre-filled details & sidebar widgets."""
        self.client.login(username='TestPlayer', password='TestPassword123')
        response = self.client.get('/contact/')
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'contact.html')
        self.assertIn('suggested_profiles', response.context)
        self.assertIn('trending_athletes', response.context)
        # Pre-filled name and email
        form = response.context['form']
        self.assertEqual(form.initial.get('name'), 'TestPlayer')
        self.assertEqual(form.initial.get('email'), 'player@test.com')

    def test_contact_form_submission(self):
        """Verify that contact form submission saves ContactMessage and redirects."""
        from .models import ContactMessage
        post_data = {
            'name': 'John Doe',
            'email': 'johndoe@example.com',
            'subject': 'Sponsorship inquiry',
            'message': 'Hello, I want to inquire about sponsorships on SportsSphere.'
        }
        response = self.client.post('/contact/', post_data)
        self.assertRedirects(response, '/contact/')
        
        # Verify message is saved to DB
        self.assertTrue(ContactMessage.objects.filter(email='johndoe@example.com').exists())
        msg = ContactMessage.objects.get(email='johndoe@example.com')
        self.assertEqual(msg.name, 'John Doe')
        self.assertEqual(msg.subject, 'Sponsorship inquiry')
        self.assertEqual(msg.message, 'Hello, I want to inquire about sponsorships on SportsSphere.')
        self.assertFalse(msg.is_read)

    def test_contact_admin_actions(self):
        """Verify ContactMessage admin action status updates."""
        from .models import ContactMessage
        from .admin import mark_feedback_read, mark_feedback_unread
        msg = ContactMessage.objects.create(
            name='Jane Doe',
            email='janedoe@example.com',
            subject='Bug Report',
            message='I found a bug in the standings page.'
        )
        self.assertFalse(msg.is_read)

        # Mock ModelAdmin queryset update
        from django.contrib.admin.sites import AdminSite
        from .admin import ContactMessageAdmin
        site = AdminSite()
        model_admin = ContactMessageAdmin(ContactMessage, site)
        
        queryset = ContactMessage.objects.filter(id=msg.id)
        mark_feedback_read(model_admin, request=None, queryset=queryset)
        msg.refresh_from_db()
        self.assertTrue(msg.is_read)
        self.assertTrue(model_admin.status_display(msg))

        mark_feedback_unread(model_admin, request=None, queryset=queryset)
        msg.refresh_from_db()
        self.assertFalse(msg.is_read)
        self.assertFalse(model_admin.status_display(msg))

    def test_blog_model_and_slug_generation(self):
        """Test Blog model auto-slug creation and unique slug handling."""
        from .models import Blog
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

        # Duplicate title should generate unique slug
        blog2 = Blog.objects.create(
            title="Football Training Innovations 2026",
            content="Second article with same title.",
            author=admin_user,
            is_published=False
        )
        self.assertTrue(blog2.slug.startswith("football-training-innovations-2026-"))
        self.assertNotEqual(blog1.slug, blog2.slug)

    def test_public_blog_views_and_draft_protection(self):
        """Test public /blogs/ and /blogs/<slug>/, ensuring drafts are protected."""
        from .models import Blog
        admin_user = User.objects.create_superuser(
            username='admin_blog_user',
            email='admin_blog@test.com',
            password='AdminPassword123'
        )
        pub_blog = Blog.objects.create(
            title="Public Tournament Guide",
            content="Guide on how to register and compete.",
            author=admin_user,
            is_published=True
        )
        draft_blog = Blog.objects.create(
            title="Secret Upcoming Features",
            content="Unpublished roadmap details.",
            author=admin_user,
            is_published=False
        )

        # Public list only contains published blog
        response = self.client.get('/blogs/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Public Tournament Guide")
        self.assertNotContains(response, "Secret Upcoming Features")

        # Public detail for published blog -> 200 OK
        resp_pub = self.client.get(f'/blogs/{pub_blog.slug}/')
        self.assertEqual(resp_pub.status_code, 200)
        self.assertContains(resp_pub, "Public Tournament Guide")

        # Public detail for draft blog -> 404 for unauthenticated
        resp_draft = self.client.get(f'/blogs/{draft_blog.slug}/')
        self.assertEqual(resp_draft.status_code, 404)

        # Superuser can preview draft blog -> 200 OK
        self.client.login(username='admin_blog_user', password='AdminPassword123')
        resp_draft_admin = self.client.get(f'/blogs/{draft_blog.slug}/')
        self.assertEqual(resp_draft_admin.status_code, 200)
        self.assertContains(resp_draft_admin, "DRAFT (Admin Preview)")

    def test_custom_admin_access_control(self):
        """Verify strict permission control for /admin-dashboard/."""
        # Unauthenticated -> redirect to login with next parameter
        resp_anon = self.client.get('/admin-dashboard/')
        self.assertEqual(resp_anon.status_code, 302)
        self.assertIn('/login/', resp_anon.url)

        # Normal authenticated user -> 403 Forbidden
        self.client.login(username='TestPlayer', password='TestPassword123')
        resp_player = self.client.get('/admin-dashboard/')
        self.assertEqual(resp_player.status_code, 403)
        self.assertTemplateUsed(resp_player, 'admin/access_denied.html')
        self.client.logout()

        # Superuser -> 200 OK with custom dashboard
        admin_user = User.objects.create_superuser(
            username='super_admin_test',
            email='superadmin@test.com',
            password='AdminPassword123'
        )
        self.client.login(username='super_admin_test', password='AdminPassword123')
        resp_admin = self.client.get('/admin-dashboard/')
        self.assertEqual(resp_admin.status_code, 200)
        self.assertTemplateUsed(resp_admin, 'admin/admin_dashboard.html')

    def test_unified_login_redirection(self):
        """Test that superusers are routed to /admin-dashboard/ while regular users route to /feed/."""
        # Normal player login
        resp_player = self.client.post('/login/', {
            'username': 'TestPlayer',
            'password': 'TestPassword123'
        })
        self.assertRedirects(resp_player, '/feed/')
        self.client.logout()

        # Superuser login
        admin_user = User.objects.create_superuser(
            username='super_route_test',
            email='routeadmin@test.com',
            password='AdminPassword123'
        )
        resp_admin = self.client.post('/login/', {
            'username': 'super_route_test',
            'password': 'AdminPassword123'
        })
        self.assertRedirects(resp_admin, '/admin-dashboard/')




