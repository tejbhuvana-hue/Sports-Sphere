"""
Firebase Cloud Messaging (FCM) integration helper module.

This module provides thread-safe, singleton initialization of the Firebase Admin SDK
using the service account credentials provided via the FIREBASE_CREDENTIALS_JSON
environment variable (standard configuration on Render).

Security notes:
- Never log full device tokens, private keys, or credentials.
- All credentials are read directly from environment memory; no credential file
  is written to disk or committed to the repository.
"""

import json
import logging
import os
import threading
from typing import Any, Dict, List, Optional, Sequence, Union

import firebase_admin
from firebase_admin import credentials, messaging
from firebase_admin.exceptions import FirebaseError

logger = logging.getLogger("core.firebase")

_init_lock = threading.Lock()
_app_instance: Optional[firebase_admin.App] = None
MAX_MULTICAST_BATCH_SIZE = 500


def get_firebase_app() -> Optional[firebase_admin.App]:
    """
    Retrieves or initializes the Firebase Admin SDK singleton application.

    Reads the service account JSON from os.environ["FIREBASE_CREDENTIALS_JSON"].
    Ensures initialization happens only once across threads.

    Returns:
        firebase_admin.App instance if successfully initialized, or None if
        credentials are not configured or invalid.
    """
    global _app_instance

    # Fast path if already initialized
    if _app_instance is not None:
        return _app_instance

    # Check if default app exists in firebase_admin._apps
    try:
        app = firebase_admin.get_app()
        _app_instance = app
        return _app_instance
    except ValueError:
        pass

    with _init_lock:
        # Double-check inside lock
        if _app_instance is not None:
            return _app_instance

        try:
            app = firebase_admin.get_app()
            _app_instance = app
            return _app_instance
        except ValueError:
            pass

        cred_raw = os.environ.get("FIREBASE_CREDENTIALS_JSON")
        if not cred_raw:
            logger.warning(
                "FIREBASE_CREDENTIALS_JSON environment variable is not set. "
                "FCM notifications will be skipped."
            )
            return None

        # Clean potential outer wrapper quotes from environment managers
        cred_clean = cred_raw.strip()
        if (cred_clean.startswith("'") and cred_clean.endswith("'")) or (
            cred_clean.startswith('"') and cred_clean.endswith('"')
        ):
            cred_clean = cred_clean[1:-1].strip()

        try:
            cred_dict = json.loads(cred_clean)
        except Exception:
            logger.error(
                "Failed to parse FIREBASE_CREDENTIALS_JSON: Invalid JSON payload."
            )
            return None

        if not isinstance(cred_dict, dict):
            logger.error(
                "Invalid FIREBASE_CREDENTIALS_JSON format: Expected a JSON object."
            )
            return None

        try:
            cred = credentials.Certificate(cred_dict)
            _app_instance = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK successfully initialized.")
            return _app_instance
        except Exception as exc:
            # Production-safe: log only error type and message without leaking credentials/keys
            logger.error(
                "Failed to initialize Firebase Admin SDK: %s - %s",
                exc.__class__.__name__,
                str(exc),
            )
            return None


def _clean_data_payload(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, str]]:
    """
    Ensures all keys and values in the FCM data dictionary are strings.
    FCM rejects non-string values with a ValueError.
    """
    if not data:
        return None

    cleaned: Dict[str, str] = {}
    for key, val in data.items():
        if val is None:
            continue
        if isinstance(val, (dict, list)):
            cleaned[str(key)] = json.dumps(val)
        elif isinstance(val, bool):
            cleaned[str(key)] = "true" if val else "false"
        else:
            cleaned[str(key)] = str(val)
    return cleaned


def send_fcm_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    image_url: Optional[str] = None,
    android_channel_id: Optional[str] = None,
    sound: Optional[str] = "default",
) -> Optional[str]:
    """
    Sends an FCM push notification to a single device token.

    Args:
        token: Target device registration token.
        title: Notification title.
        body: Notification body text.
        data: Optional custom key-value payload (all values will be converted to strings).
        image_url: Optional URL of an image to display in the notification.
        android_channel_id: Optional Android notification channel ID.
        sound: Notification sound (default: 'default').

    Returns:
        Message ID string if delivered successfully, or None if failed or skipped.
    """
    if not token or not isinstance(token, str) or not token.strip():
        logger.warning("FCM notification skipped: Target device token is empty.")
        return None

    app = get_firebase_app()
    if app is None:
        return None

    notification = messaging.Notification(
        title=title,
        body=body,
        image=image_url,
    )

    android_notification = (
        messaging.AndroidNotification(
            sound=sound,
            channel_id=android_channel_id,
        )
        if (sound or android_channel_id)
        else None
    )

    android_config = messaging.AndroidConfig(
        priority="high",
        notification=android_notification,
    )

    apns_payload = (
        messaging.APNSPayload(aps=messaging.Aps(sound=sound)) if sound else None
    )
    apns_config = (
        messaging.APNSConfig(payload=apns_payload) if apns_payload else None
    )

    message = messaging.Message(
        token=token.strip(),
        notification=notification,
        data=_clean_data_payload(data),
        android=android_config,
        apns=apns_config,
    )

    try:
        response = messaging.send(message, app=app)
        logger.debug("FCM notification sent successfully.")
        return response
    except messaging.UnregisteredError:
        logger.warning(
            "FCM notification failed: Device registration token is expired or unregistered."
        )
        return None
    except FirebaseError as exc:
        logger.error("FCM notification failed (FirebaseError): %s", exc)
        return None
    except Exception as exc:
        logger.error(
            "Unexpected error sending FCM notification: %s - %s",
            exc.__class__.__name__,
            str(exc),
        )
        return None


def send_multicast_fcm_notification(
    tokens: Sequence[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    image_url: Optional[str] = None,
    android_channel_id: Optional[str] = None,
    sound: Optional[str] = "default",
) -> Dict[str, Any]:
    """
    Sends an FCM push notification to multiple device tokens.
    Handles FCM's 500-token batch limit automatically.

    Args:
        tokens: Sequence of target device registration tokens.
        title: Notification title.
        body: Notification body text.
        data: Optional custom key-value payload.
        image_url: Optional image URL.
        android_channel_id: Optional Android notification channel ID.
        sound: Notification sound (default: 'default').

    Returns:
        Dictionary with:
            - success_count (int): Total messages delivered successfully.
            - failure_count (int): Total delivery failures.
            - unregistered_tokens (List[str]): Tokens identified as expired or unregistered.
            - failed_tokens (List[Dict[str, Any]]): Details of failures without logging tokens.
    """
    result: Dict[str, Any] = {
        "success_count": 0,
        "failure_count": 0,
        "unregistered_tokens": [],
        "failed_tokens": [],
    }

    # Filter out empty or duplicate tokens while preserving order
    clean_tokens: List[str] = list(
        dict.fromkeys(
            t.strip() for t in tokens if t and isinstance(t, str) and t.strip()
        )
    )

    if not clean_tokens:
        logger.debug("FCM multicast skipped: No valid device tokens provided.")
        return result

    app = get_firebase_app()
    if app is None:
        result["failure_count"] = len(clean_tokens)
        return result

    notification = messaging.Notification(
        title=title,
        body=body,
        image=image_url,
    )

    android_notification = (
        messaging.AndroidNotification(
            sound=sound,
            channel_id=android_channel_id,
        )
        if (sound or android_channel_id)
        else None
    )

    android_config = messaging.AndroidConfig(
        priority="high",
        notification=android_notification,
    )

    apns_payload = (
        messaging.APNSPayload(aps=messaging.Aps(sound=sound)) if sound else None
    )
    apns_config = (
        messaging.APNSConfig(payload=apns_payload) if apns_payload else None
    )

    cleaned_data = _clean_data_payload(data)

    # Process in batches of up to MAX_MULTICAST_BATCH_SIZE (500)
    for i in range(0, len(clean_tokens), MAX_MULTICAST_BATCH_SIZE):
        batch = clean_tokens[i : i + MAX_MULTICAST_BATCH_SIZE]
        multicast_message = messaging.MulticastMessage(
            tokens=batch,
            notification=notification,
            data=cleaned_data,
            android=android_config,
            apns=apns_config,
        )

        try:
            batch_response = messaging.send_each_for_multicast(
                multicast_message, app=app
            )
            result["success_count"] += batch_response.success_count
            result["failure_count"] += batch_response.failure_count

            for idx, resp in enumerate(batch_response.responses):
                if not resp.success:
                    token_val = batch[idx]
                    exc = resp.exception
                    is_unregistered = isinstance(exc, messaging.UnregisteredError)

                    if is_unregistered:
                        result["unregistered_tokens"].append(token_val)

                    result["failed_tokens"].append(
                        {
                            "token": token_val,
                            "error": str(exc) if exc else "Unknown error",
                            "is_unregistered": is_unregistered,
                        }
                    )
        except FirebaseError as exc:
            logger.error("FCM batch multicast failed (FirebaseError): %s", exc)
            result["failure_count"] += len(batch)
        except Exception as exc:
            logger.error(
                "Unexpected error during FCM batch multicast: %s - %s",
                exc.__class__.__name__,
                str(exc),
            )
            result["failure_count"] += len(batch)

    logger.info(
        "FCM multicast complete: %d successes, %d failures.",
        result["success_count"],
        result["failure_count"],
    )
    return result


def send_notification_to_user(
    user: Any,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    image_url: Optional[str] = None,
    cleanup_unregistered: bool = True,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Helper to send push notifications to all registered device tokens for a given user.

    Args:
        user: Django User instance (or user model with device_tokens relation).
        title: Notification title.
        body: Notification body text.
        data: Optional custom key-value payload.
        image_url: Optional image URL.
        cleanup_unregistered: Whether to delete invalid/expired tokens automatically (default: True).
        **kwargs: Additional parameters passed to send_multicast_fcm_notification.

    Returns:
        Delivery result dictionary from send_multicast_fcm_notification.
    """
    if user is None:
        return {
            "success_count": 0,
            "failure_count": 0,
            "unregistered_tokens": [],
            "failed_tokens": [],
        }

    try:
        from core.models import DeviceToken

        tokens = list(
            DeviceToken.objects.filter(user=user).values_list("token", flat=True)
        )
    except Exception as exc:
        logger.error("Error querying device tokens for user: %s", exc)
        return {
            "success_count": 0,
            "failure_count": 0,
            "unregistered_tokens": [],
            "failed_tokens": [],
        }

    if not tokens:
        return {
            "success_count": 0,
            "failure_count": 0,
            "unregistered_tokens": [],
            "failed_tokens": [],
        }

    res = send_multicast_fcm_notification(
        tokens=tokens,
        title=title,
        body=body,
        data=data,
        image_url=image_url,
        **kwargs,
    )

    if cleanup_unregistered and res.get("unregistered_tokens"):
        try:
            from core.models import DeviceToken

            deleted_count, _ = DeviceToken.objects.filter(
                user=user, token__in=res["unregistered_tokens"]
            ).delete()
            logger.info("Removed %d unregistered device token(s).", deleted_count)
        except Exception as exc:
            logger.warning("Failed to remove unregistered device tokens: %s", exc)

    return res


def send_notification_to_users(
    users: Sequence[Any],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    image_url: Optional[str] = None,
    cleanup_unregistered: bool = True,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Helper to send push notifications to all registered device tokens across multiple users.

    Args:
        users: Sequence or QuerySet of Django User instances.
        title: Notification title.
        body: Notification body text.
        data: Optional custom key-value payload.
        image_url: Optional image URL.
        cleanup_unregistered: Whether to delete invalid/expired tokens automatically (default: True).
        **kwargs: Additional parameters passed to send_multicast_fcm_notification.

    Returns:
        Delivery result dictionary.
    """
    if not users:
        return {
            "success_count": 0,
            "failure_count": 0,
            "unregistered_tokens": [],
            "failed_tokens": [],
        }

    try:
        from core.models import DeviceToken

        tokens = list(
            DeviceToken.objects.filter(user__in=users).values_list("token", flat=True)
        )
    except Exception as exc:
        logger.error("Error querying device tokens for users: %s", exc)
        return {
            "success_count": 0,
            "failure_count": 0,
            "unregistered_tokens": [],
            "failed_tokens": [],
        }

    if not tokens:
        return {
            "success_count": 0,
            "failure_count": 0,
            "unregistered_tokens": [],
            "failed_tokens": [],
        }

    res = send_multicast_fcm_notification(
        tokens=tokens,
        title=title,
        body=body,
        data=data,
        image_url=image_url,
        **kwargs,
    )

    if cleanup_unregistered and res.get("unregistered_tokens"):
        try:
            from core.models import DeviceToken

            deleted_count, _ = DeviceToken.objects.filter(
                token__in=res["unregistered_tokens"]
            ).delete()
            logger.info("Removed %d unregistered device token(s).", deleted_count)
        except Exception as exc:
            logger.warning("Failed to remove unregistered device tokens: %s", exc)

    return res
