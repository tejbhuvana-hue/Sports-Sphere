import json
import os
from unittest.mock import MagicMock, patch
from django.test import SimpleTestCase, TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

import firebase_admin
from firebase_admin import messaging

from core import firebase
from core.models import DeviceToken


class FirebaseIntegrationTests(SimpleTestCase):
    # Do not connect to or set up remote database
    databases = []

    def setUp(self):
        # Reset module-level singleton state between tests
        firebase._app_instance = None
        if firebase_admin._DEFAULT_APP_NAME in firebase_admin._apps:
            del firebase_admin._apps[firebase_admin._DEFAULT_APP_NAME]

    def tearDown(self):
        firebase._app_instance = None
        if firebase_admin._DEFAULT_APP_NAME in firebase_admin._apps:
            del firebase_admin._apps[firebase_admin._DEFAULT_APP_NAME]

    def test_get_firebase_app_missing_env(self):
        with patch.dict(os.environ, {}, clear=True):
            app = firebase.get_firebase_app()
            self.assertIsNone(app)

    def test_get_firebase_app_invalid_json(self):
        with patch.dict(os.environ, {"FIREBASE_CREDENTIALS_JSON": "not-a-valid-json"}):
            app = firebase.get_firebase_app()
            self.assertIsNone(app)

    def test_get_firebase_app_not_a_dict(self):
        with patch.dict(os.environ, {"FIREBASE_CREDENTIALS_JSON": '["not", "a", "dict"]'}):
            app = firebase.get_firebase_app()
            self.assertIsNone(app)

    @patch("firebase_admin.credentials.Certificate")
    @patch("firebase_admin.initialize_app")
    def test_get_firebase_app_singleton_initialization(self, mock_init, mock_cert):
        fake_app = MagicMock()
        mock_init.return_value = fake_app
        mock_cert.return_value = MagicMock()

        dummy_creds = {"type": "service_account", "project_id": "test-project"}
        with patch.dict(os.environ, {"FIREBASE_CREDENTIALS_JSON": json.dumps(dummy_creds)}):
            # First call
            app1 = firebase.get_firebase_app()
            self.assertEqual(app1, fake_app)
            self.assertEqual(mock_init.call_count, 1)

            # Second call should use cached singleton
            app2 = firebase.get_firebase_app()
            self.assertEqual(app2, fake_app)
            self.assertEqual(mock_init.call_count, 1)

    def test_clean_data_payload(self):
        self.assertIsNone(firebase._clean_data_payload(None))
        self.assertIsNone(firebase._clean_data_payload({}))

        data = {
            "num": 123,
            "flag": True,
            "false_flag": False,
            "text": "hello",
            "nested": {"key": "val"},
            "ignored": None,
        }
        cleaned = firebase._clean_data_payload(data)
        self.assertEqual(cleaned["num"], "123")
        self.assertEqual(cleaned["flag"], "true")
        self.assertEqual(cleaned["false_flag"], "false")
        self.assertEqual(cleaned["text"], "hello")
        self.assertEqual(cleaned["nested"], '{"key": "val"}')
        self.assertNotIn("ignored", cleaned)

    def test_send_fcm_notification_empty_token(self):
        self.assertIsNone(firebase.send_fcm_notification("", "Title", "Body"))
        self.assertIsNone(firebase.send_fcm_notification("   ", "Title", "Body"))

    @patch.object(firebase, "get_firebase_app")
    def test_send_fcm_notification_missing_app(self, mock_get_app):
        mock_get_app.return_value = None
        res = firebase.send_fcm_notification("fake_token", "Title", "Body")
        self.assertIsNone(res)

    @patch.object(firebase, "get_firebase_app")
    @patch("firebase_admin.messaging.send")
    def test_send_fcm_notification_success(self, mock_send, mock_get_app):
        mock_app = MagicMock()
        mock_get_app.return_value = mock_app
        mock_send.return_value = "projects/test/messages/msg123"

        msg_id = firebase.send_fcm_notification(
            token="valid_token_123",
            title="Goal Scored!",
            body="Your team just scored!",
            data={"match_id": 42},
            android_channel_id="sports_updates",
        )

        self.assertEqual(msg_id, "projects/test/messages/msg123")
        mock_send.assert_called_once()
        message_arg = mock_send.call_args[0][0]
        self.assertEqual(message_arg.token, "valid_token_123")
        self.assertEqual(message_arg.notification.title, "Goal Scored!")
        self.assertEqual(message_arg.notification.body, "Your team just scored!")
        self.assertEqual(message_arg.data, {"match_id": "42"})
        self.assertEqual(message_arg.android.notification.channel_id, "sports_updates")

    @patch.object(firebase, "get_firebase_app")
    @patch("firebase_admin.messaging.send")
    def test_send_fcm_notification_unregistered_error(self, mock_send, mock_get_app):
        mock_get_app.return_value = MagicMock()
        mock_send.side_effect = messaging.UnregisteredError("Token unregistered")

        res = firebase.send_fcm_notification("expired_token", "Title", "Body")
        self.assertIsNone(res)

    @patch.object(firebase, "get_firebase_app")
    @patch("firebase_admin.messaging.send_each_for_multicast")
    def test_send_multicast_fcm_notification(self, mock_send_multicast, mock_get_app):
        mock_get_app.return_value = MagicMock()

        resp1 = MagicMock(success=True, message_id="msg1", exception=None)
        resp2 = MagicMock(
            success=False,
            message_id=None,
            exception=messaging.UnregisteredError("Unregistered token"),
        )
        mock_batch = MagicMock(success_count=1, failure_count=1, responses=[resp1, resp2])
        mock_send_multicast.return_value = mock_batch

        tokens = ["token_1", "token_2", "token_1"]  # includes duplicate
        result = firebase.send_multicast_fcm_notification(
            tokens=tokens,
            title="Tournament Reminder",
            body="Match starts in 15 mins",
        )

        self.assertEqual(result["success_count"], 1)
        self.assertEqual(result["failure_count"], 1)
        self.assertEqual(result["unregistered_tokens"], ["token_2"])
        self.assertEqual(len(result["failed_tokens"]), 1)

    @patch("core.models.DeviceToken.objects")
    @patch.object(firebase, "send_multicast_fcm_notification")
    def test_send_notification_to_user(self, mock_send_multicast, mock_device_tokens):
        mock_user = MagicMock()
        mock_filter_qs = MagicMock()
        mock_filter_qs.values_list.return_value = ["tok_user_1", "tok_user_2"]
        mock_delete_qs = MagicMock()
        mock_delete_qs.delete.return_value = (1, {})

        def filter_side_effect(**kwargs):
            if "token__in" in kwargs:
                return mock_delete_qs
            return mock_filter_qs

        mock_device_tokens.filter.side_effect = filter_side_effect

        mock_send_multicast.return_value = {
            "success_count": 1,
            "failure_count": 1,
            "unregistered_tokens": ["tok_user_2"],
            "failed_tokens": [],
        }

        res = firebase.send_notification_to_user(
            user=mock_user,
            title="New Message",
            body="You have a new comment",
            cleanup_unregistered=True,
        )

        self.assertEqual(res["success_count"], 1)
        mock_device_tokens.filter.assert_any_call(user=mock_user, token__in=["tok_user_2"])
        mock_delete_qs.delete.assert_called_once()

    @patch("core.models.DeviceToken.objects")
    @patch.object(firebase, "send_multicast_fcm_notification")
    def test_send_notification_to_users(self, mock_send_multicast, mock_device_tokens):
        mock_users = [MagicMock(), MagicMock()]
        mock_filter_qs = MagicMock()
        mock_filter_qs.values_list.return_value = ["tok_user_1", "tok_user_2"]
        mock_device_tokens.filter.return_value = mock_filter_qs

        mock_send_multicast.return_value = {
            "success_count": 2,
            "failure_count": 0,
            "unregistered_tokens": [],
            "failed_tokens": [],
        }

        res = firebase.send_notification_to_users(
            users=mock_users,
            title="Announcement",
            body="Match scheduled",
        )

        self.assertEqual(res["success_count"], 2)
        mock_device_tokens.filter.assert_called_with(user__in=mock_users)


@override_settings(SECURE_SSL_REDIRECT=False)
class DeviceTokenAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.user1 = User.objects.create_user(
            username='athlete_1',
            email='athlete1@test.com',
            password='Password123!'
        )
        self.user2 = User.objects.create_user(
            username='athlete_2',
            email='athlete2@test.com',
            password='Password123!'
        )
        self.token1, _ = Token.objects.get_or_create(user=self.user1)
        self.token2, _ = Token.objects.get_or_create(user=self.user2)

    def test_authenticated_token_registration(self):
        """Authenticated user can successfully register an FCM device token."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        response = self.client.post('/api/device-tokens/', {'token': 'fcm_token_alpha'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(DeviceToken.objects.filter(user=self.user1, token='fcm_token_alpha').count(), 1)
        # Verify no credentials leaked
        data = response.json()
        self.assertNotIn('firebase', data)
        self.assertNotIn('service_account', data)

    def test_duplicate_token_handling(self):
        """Submitting the same token reuses/updates it rather than creating duplicates."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        res1 = self.client.post('/api/device-tokens/', {'token': 'duplicate_token_123'}, format='json')
        self.assertEqual(res1.status_code, 201)

        res2 = self.client.post('/api/device-tokens/', {'token': 'duplicate_token_123'}, format='json')
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(DeviceToken.objects.filter(token='duplicate_token_123').count(), 1)

    def test_unauthenticated_access_rejection(self):
        """Unauthenticated requests must be rejected with 401 Unauthorized."""
        response = self.client.post('/api/device-tokens/', {'token': 'unauth_token'}, format='json')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(DeviceToken.objects.filter(token='unauth_token').count(), 0)

    def test_token_belonging_to_correct_user_and_transfer(self):
        """Token belongs to request.user; when user2 registers the same token from the same device, it transfers cleanly."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        self.client.post('/api/device-tokens/', {'token': 'shared_phone_token'}, format='json')
        dt = DeviceToken.objects.get(token='shared_phone_token')
        self.assertEqual(dt.user, self.user1)

        # User 2 logs into the same phone and registers the same token
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token2.key}')
        self.client.post('/api/device-tokens/', {'token': 'shared_phone_token'}, format='json')
        self.assertEqual(DeviceToken.objects.filter(token='shared_phone_token').count(), 1)
        dt.refresh_from_db()
        self.assertEqual(dt.user, self.user2)

    def test_user_can_have_multiple_device_tokens(self):
        """A user may register multiple device tokens (e.g. phone and tablet)."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        self.client.post('/api/device-tokens/', {'token': 'user1_phone_token'}, format='json')
        self.client.post('/api/device-tokens/', {'token': 'user1_tablet_token'}, format='json')
        self.assertEqual(DeviceToken.objects.filter(user=self.user1).count(), 2)

    def test_token_removal_via_delete_endpoint(self):
        """A user can deregister their device token."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        self.client.post('/api/device-tokens/', {'token': 'token_to_remove'}, format='json')
        self.assertEqual(DeviceToken.objects.filter(token='token_to_remove', user=self.user1).count(), 1)

        del_res = self.client.delete('/api/device-tokens/', {'token': 'token_to_remove'}, format='json')
        self.assertEqual(del_res.status_code, 200)
        self.assertEqual(DeviceToken.objects.filter(token='token_to_remove').count(), 0)

    def test_token_removal_on_logout(self):
        """Logging out can cleanly unregister the device token so another user on the same phone does not inherit it."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        self.client.post('/api/device-tokens/', {'token': 'token_for_logout'}, format='json')
        self.assertEqual(DeviceToken.objects.filter(token='token_for_logout', user=self.user1).count(), 1)

        logout_res = self.client.post('/api/auth/logout/', {'token': 'token_for_logout'}, format='json')
        self.assertEqual(logout_res.status_code, 200)
        self.assertEqual(DeviceToken.objects.filter(token='token_for_logout').count(), 0)

    def test_empty_or_missing_token_validation(self):
        """Missing or whitespace-only tokens return 400 Bad Request."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        res1 = self.client.post('/api/device-tokens/', {}, format='json')
        self.assertEqual(res1.status_code, 400)

        res2 = self.client.post('/api/device-tokens/', {'token': '   '}, format='json')
        self.assertEqual(res2.status_code, 400)

