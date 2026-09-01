import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.conf import settings
from core.models import Profile, Message, Notification, User

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return
            
        self.other_username = self.scope["url_route"]["kwargs"]["username"]
        
        # Room name based on both usernames sorted alphabetically
        usernames = sorted([self.user.username, self.other_username])
        self.room_name = f"chat_{usernames[0]}_{usernames[1]}"
        self.room_group_name = f"group_{self.room_name}"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Set user as online
        await self.set_online_status(self.user, True)
        
        # Broadcast online status
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_status",
                "username": self.user.username,
                "is_online": True
            }
        )

        # Mark previous messages from other user to self as read
        await self.mark_messages_as_read(self.other_username, self.user)
        
        # Notify the other user that messages have been read
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "read_receipt",
                "reader": self.user.username
            }
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Set user as offline
        await self.set_online_status(self.user, False)
        
        # Broadcast offline status
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_status",
                "username": self.user.username,
                "is_online": False
            }
        )

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        action_type = data.get("type", "message")
        
        if action_type == "message":
            content = data.get("message", "")
            image_url = data.get("image_url", None)
            
            # Save message to database
            msg_data = await self.save_chat_message(
                self.user, 
                self.other_username, 
                content, 
                image_url
            )
            
            if msg_data:
                # Broadcast message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message",
                        "message_data": msg_data
                    }
                )
                
                # Check if recipient is online in this room to mark read immediately
                # Also, send a live notification alert to the recipient's notification socket
                await self.trigger_live_notification(self.user, self.other_username, msg_data["content"] or "[Sent an image]")

        elif action_type == "read":
            # Client notifies that they've read the chat
            await self.mark_messages_as_read(self.other_username, self.user)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "read_receipt",
                    "reader": self.user.username
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        message_data = event["message_data"]
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            "type": "message",
            "data": message_data
        }))

    # Receive status broadcast
    async def user_status(self, event):
        await self.send(text_data=json.dumps({
            "type": "status",
            "username": event["username"],
            "is_online": event["is_online"]
        }))

    # Receive read receipt broadcast
    async def read_receipt(self, event):
        await self.send(text_data=json.dumps({
            "type": "read",
            "reader": event["reader"]
        }))

    # Helper database operations
    @database_sync_to_async
    def set_online_status(self, user, is_online):
        Profile.objects.filter(user=user).update(is_online=is_online)

    @database_sync_to_async
    def mark_messages_as_read(self, sender_username, receiver):
        Message.objects.filter(sender__username=sender_username, receiver=receiver, is_read=False).update(is_read=True)

    @database_sync_to_async
    def save_chat_message(self, sender, receiver_username, content=None, image_url=None):
        try:
            receiver = User.objects.get(username=receiver_username)
            msg = Message.objects.create(
                sender=sender,
                receiver=receiver,
                content=content
            )
            if image_url:
                # Remove media domain prefix to get local path for ImageField
                relative_path = image_url.replace(settings.MEDIA_URL, '')
                msg.image = relative_path
                msg.save()
                
            return {
                "id": msg.id,
                "sender": sender.username,
                "receiver": receiver.username,
                "content": msg.content,
                "image_url": msg.image.url if msg.image else None,
                "timestamp": msg.timestamp.strftime("%I:%M %p"),
                "is_read": msg.is_read
            }
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def trigger_live_notification(self, sender, recipient_username, content_preview):
        try:
            recipient = User.objects.get(username=recipient_username)
            # Create a message notification in database
            Notification.objects.create(
                recipient=recipient,
                sender=sender,
                notification_type=Notification.NotificationType.MESSAGE,
                content_preview=content_preview[:80] if len(content_preview) > 80 else content_preview
            )
        except Exception as e:
            print(f"Error triggering live notification: {e}")


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return

        self.group_name = f"user_{self.user.id}"

        # Join notifications group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave notifications group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Receive notification event from group
    async def send_notification(self, event):
        # Send notification package directly to client
        await self.send(text_data=json.dumps({
            "type": "notification",
            "notification_id": event.get("notification_id"),
            "sender": event.get("sender"),
            "sender_avatar": event.get("sender_avatar"),
            "notification_type": event.get("notification_type"),
            "post_id": event.get("post_id"),
            "timestamp": event.get("timestamp"),
            "message": event.get("message")
        }))
