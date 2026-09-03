from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token

User = get_user_model()


class GoogleAuthAPITests(APITestCase):
    def setUp(self):
        self.url = reverse('api_google_auth')
        self.google_payload = {
            'email': 'athlete@example.com',
            'email_verified': True,
            'name': 'Test Athlete',
            'given_name': 'Test',
            'family_name': 'Athlete',
            'sub': 'google-uid-123456789',
        }

    def test_missing_token(self):
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_new_user_registration_via_google(self, mock_verify):
        mock_verify.return_value = self.google_payload

        response = self.client.post(self.url, {
            'id_token': 'fake-valid-google-id-token',
            'role': User.Role.COACH
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('is_new_user'))
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['email'], 'athlete@example.com')
        self.assertEqual(response.data['user']['role'], User.Role.COACH)

        user = User.objects.get(email='athlete@example.com')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'Athlete')
        self.assertTrue(hasattr(user, 'profile'))

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_existing_user_login_via_google(self, mock_verify):
        existing_user = User.objects.create_user(
            username='existing_player',
            email='athlete@example.com',
            role=User.Role.PLAYER,
            password='secretpassword'
        )
        mock_verify.return_value = self.google_payload

        response = self.client.post(self.url, {
            'id_token': 'fake-valid-google-id-token'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get('is_new_user'))
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['id'], existing_user.id)
        self.assertEqual(response.data['user']['username'], 'existing_player')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_invalid_google_token(self, mock_verify):
        mock_verify.side_effect = ValueError('Token expired')

        response = self.client.post(self.url, {
            'id_token': 'invalid-token'
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
