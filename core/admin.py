from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Profile, Post, Comment, Notification, ContactMessage, Follow, Message

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'role', 'is_staff', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Networking', {'fields': ('role',)}),
    )

class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'location', 'sport', 'position']
    list_filter = ['user__role', 'location']
    search_fields = ['user__username', 'location', 'sport']

class PostAdmin(admin.ModelAdmin):
    list_display = ['author', 'created_at', 'total_likes']
    list_filter = ['created_at', 'author']
    search_fields = ['content', 'author__username']

class CommentAdmin(admin.ModelAdmin):
    list_display = ['author', 'post', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'author__username']

class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'sender', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']

admin.site.register(User, CustomUserAdmin)
admin.site.register(Profile, ProfileAdmin)
admin.site.register(Post, PostAdmin)
admin.site.register(Comment, CommentAdmin)
admin.site.register(Notification, NotificationAdmin)


@admin.action(description="Mark selected feedback as Read")
def mark_feedback_read(modeladmin, request, queryset):
    queryset.update(is_read=True)


@admin.action(description="Mark selected feedback as Unread")
def mark_feedback_unread(modeladmin, request, queryset):
    queryset.update(is_read=False)


class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'created_at', 'status_display']
    list_filter = ['is_read', 'created_at']
    search_fields = ['name', 'email', 'subject', 'message']
    actions = [mark_feedback_read, mark_feedback_unread]

    @admin.display(description='Status', boolean=True)
    def status_display(self, obj):
        return obj.is_read


admin.site.register(ContactMessage, ContactMessageAdmin)


class FollowAdmin(admin.ModelAdmin):
    list_display = ['follower', 'following', 'created_at']
    search_fields = ['follower__username', 'following__username']
    list_filter = ['created_at']


class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'receiver', 'content_snippet', 'timestamp', 'is_read']
    search_fields = ['sender__username', 'receiver__username', 'content']
    list_filter = ['is_read', 'timestamp']

    def content_snippet(self, obj):
        return obj.content[:30] if obj.content else ""
    content_snippet.short_description = 'Content'


admin.site.register(Follow, FollowAdmin)
admin.site.register(Message, MessageAdmin)


