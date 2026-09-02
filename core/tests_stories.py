import datetime
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from core.models import Story, StoryView, Follow

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class StoryFeatureTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # User A: Follower of B
        self.user_a = User.objects.create_user(
            username='AthleteA',
            email='athleteA@test.com',
            password='TestPassword123!',
            role=User.Role.PLAYER
        )
        self.token_a, _ = Token.objects.get_or_create(user=self.user_a)

        # User B: Story Creator (followed by A)
        self.user_b = User.objects.create_user(
            username='CoachB',
            email='coachB@test.com',
            password='TestPassword123!',
            role=User.Role.COACH
        )
        self.token_b, _ = Token.objects.get_or_create(user=self.user_b)

        # User C: Unrelated user (does not follow B, not followed by B)
        self.user_c = User.objects.create_user(
            username='ScoutC',
            email='scoutC@test.com',
            password='TestPassword123!',
            role=User.Role.SCOUT
        )
        self.token_c, _ = Token.objects.get_or_create(user=self.user_c)

        # Establish one-way follow: User A follows User B
        Follow.objects.create(follower=self.user_a, following=self.user_b)

    def test_story_creation_and_24h_expiration(self):
        """Test creating text story and verify automatic 24-hour expiration."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_b.key}')
        response = self.client.post('/api/stories/', {
            'story_type': 'TEXT',
            'text_content': 'Morning training session complete! ⚽🔥',
            'background_style': 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)'
        }, format='json')

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data['story_type'], 'TEXT')
        self.assertEqual(data['text_content'], 'Morning training session complete! ⚽🔥')
        self.assertEqual(data['user']['username'], 'CoachB')
        self.assertTrue(data['is_owner'])

        # Verify database model and expiration
        story = Story.objects.get(id=data['id'])
        self.assertTrue(story.is_active)
        expected_expiry_min = timezone.now() + datetime.timedelta(hours=23, minutes=50)
        expected_expiry_max = timezone.now() + datetime.timedelta(hours=24, minutes=10)
        self.assertTrue(expected_expiry_min <= story.expires_at <= expected_expiry_max)

    def test_story_visibility_follow_relationship(self):
        """
        Critical Test:
        User A follows User B.
        User B posts Story.
        User A CAN see Story in feed tray and directly via GET /api/stories/<id>/.
        User C does not follow User B -> User C CANNOT see Story in tray and gets 403 Forbidden directly.
        """
        # User B posts story
        story_b = Story.objects.create(
            user=self.user_b,
            story_type=Story.StoryType.TEXT,
            text_content="Exclusive coach insights!"
        )

        # 1. User A (follower) checks Feed Tray
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        tray_res = self.client.get('/api/stories/')
        self.assertEqual(tray_res.status_code, 200)
        tray_data = tray_res.json()

        # User A should see their own group first, then User B's group
        b_group = next((g for g in tray_data if g['user']['username'] == 'CoachB'), None)
        self.assertIsNotNone(b_group)
        self.assertEqual(len(b_group['stories']), 1)
        self.assertEqual(b_group['stories'][0]['id'], story_b.id)

        # User A directly requests Story B
        detail_res = self.client.get(f'/api/stories/{story_b.id}/')
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.json()['id'], story_b.id)

        # 2. User C (non-follower) checks Feed Tray
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_c.key}')
        c_tray_res = self.client.get('/api/stories/')
        self.assertEqual(c_tray_res.status_code, 200)
        c_tray_data = c_tray_res.json()

        # User B should NOT be in User C's tray
        c_b_group = next((g for g in c_tray_data if g['user']['username'] == 'CoachB'), None)
        self.assertIsNone(c_b_group)

        # User C attempts direct API access to Story B -> MUST be 403 Forbidden!
        c_detail_res = self.client.get(f'/api/stories/{story_b.id}/')
        self.assertEqual(c_detail_res.status_code, 403)
        self.assertIn('permission', c_detail_res.json().get('error', '').lower())

    def test_one_way_follow_directionality(self):
        """
        Critical Test:
        User A follows User B.
        User B does NOT follow User A.
        User A posts Story.
        User B must NOT see User A's story in tray and must get 403 Forbidden on direct GET.
        """
        story_a = Story.objects.create(
            user=self.user_a,
            story_type=Story.StoryType.TEXT,
            text_content="Player personal highlight"
        )

        # User B checks Feed Tray
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_b.key}')
        b_tray_res = self.client.get('/api/stories/')
        self.assertEqual(b_tray_res.status_code, 200)
        b_tray_data = b_tray_res.json()

        # User A should NOT appear in User B's tray
        a_group = next((g for g in b_tray_data if g['user']['username'] == 'AthleteA'), None)
        self.assertIsNone(a_group)

        # User B attempts direct GET -> MUST be 403 Forbidden!
        b_detail_res = self.client.get(f'/api/stories/{story_a.id}/')
        self.assertEqual(b_detail_res.status_code, 403)

    def test_expired_story_excluded_and_inaccessible(self):
        """Verify that stories older than 24 hours are excluded from tray and return 404."""
        expired_story = Story.objects.create(
            user=self.user_b,
            story_type=Story.StoryType.TEXT,
            text_content="Old yesterday update",
            expires_at=timezone.now() - datetime.timedelta(minutes=5)
        )

        self.assertFalse(expired_story.is_active)

        # User A checks tray
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        tray_res = self.client.get('/api/stories/')
        b_group = next((g for g in tray_res.json() if g['user']['username'] == 'CoachB'), None)
        self.assertIsNone(b_group)

        # Direct access returns 404
        detail_res = self.client.get(f'/api/stories/{expired_story.id}/')
        self.assertEqual(detail_res.status_code, 404)

    def test_story_view_recording_and_duplicate_prevention(self):
        """Test recording story views and verify duplicate views are prevented."""
        story_b = Story.objects.create(
            user=self.user_b,
            story_type=Story.StoryType.TEXT,
            text_content="Story view tracking test"
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')

        # First view
        res1 = self.client.post(f'/api/stories/{story_b.id}/view/')
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()['views_count'], 1)

        # Second view by same user -> count remains 1
        res2 = self.client.post(f'/api/stories/{story_b.id}/view/')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()['views_count'], 1)
        self.assertEqual(StoryView.objects.filter(story=story_b, viewer=self.user_a).count(), 1)

    def test_story_viewers_list_owner_only_permission(self):
        """Test that ONLY the story owner can view the list of viewers."""
        story_b = Story.objects.create(
            user=self.user_b,
            story_type=Story.StoryType.TEXT,
            text_content="Secret coach playbook"
        )

        # User A views story
        StoryView.objects.create(story=story_b, viewer=self.user_a)

        # User A attempts to view viewers list -> 403 Forbidden!
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        a_viewers_res = self.client.get(f'/api/stories/{story_b.id}/viewers/')
        self.assertEqual(a_viewers_res.status_code, 403)

        # User B (owner) views viewers list -> 200 OK with viewer data
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_b.key}')
        b_viewers_res = self.client.get(f'/api/stories/{story_b.id}/viewers/')
        self.assertEqual(b_viewers_res.status_code, 200)
        data = b_viewers_res.json()
        self.assertEqual(data['viewers_count'], 1)
        self.assertEqual(data['viewers'][0]['viewer']['username'], 'AthleteA')

    def test_story_deletion_permissions(self):
        """Test that only story owner can delete a story."""
        story_b = Story.objects.create(
            user=self.user_b,
            story_type=Story.StoryType.TEXT,
            text_content="Story to be deleted"
        )

        # User A attempts delete -> 403 Forbidden
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_a.key}')
        del_res_a = self.client.delete(f'/api/stories/{story_b.id}/')
        self.assertEqual(del_res_a.status_code, 403)
        self.assertTrue(Story.objects.filter(id=story_b.id).exists())

        # User B (owner) deletes story -> 200 OK
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token_b.key}')
        del_res_b = self.client.delete(f'/api/stories/{story_b.id}/')
        self.assertEqual(del_res_b.status_code, 200)
        self.assertFalse(Story.objects.filter(id=story_b.id).exists())
