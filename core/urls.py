from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('auth/register/', views.RegisterAPIView.as_view(), name='api_register'),
    path('auth/login/', views.LoginAPIView.as_view(), name='api_login'),
    path('auth/logout/', views.LogoutAPIView.as_view(), name='api_logout'),
    path('auth/me/', views.CurrentUserAPIView.as_view(), name='api_current_user'),
    path('auth/password-reset/', views.PasswordResetAPIView.as_view(), name='api_password_reset'),

    # Profiles & Users
    path('profiles/update/', views.ProfileUpdateAPIView.as_view(), name='api_profile_update'),
    path('profiles/toggle-verify/', views.ToggleVerificationAPIView.as_view(), name='api_profile_toggle_verify'),
    path('profiles/resume/<str:item_type>/', views.ResumeItemAPIView.as_view(), name='api_resume_item_add'),
    path('profiles/resume/<str:item_type>/<int:item_id>/', views.ResumeItemAPIView.as_view(), name='api_resume_item_delete'),
    path('profiles/<int:player_id>/endorse/<str:category>/', views.ToggleEndorsementAPIView.as_view(), name='api_toggle_endorsement'),
    path('profiles/<int:player_id>/recommend/', views.AddRecommendationAPIView.as_view(), name='api_add_recommendation'),
    path('profiles/<str:username>/', views.UserProfileDetailAPIView.as_view(), name='api_user_profile'),

    # Follows
    path('follows/<int:user_id>/toggle/', views.FollowToggleAPIView.as_view(), name='api_follow_toggle'),
    path('follows/<str:username>/followers/', views.FollowersListAPIView.as_view(), name='api_followers_list'),
    path('follows/<str:username>/following/', views.FollowingListAPIView.as_view(), name='api_following_list'),

    # Feed & Posts
    path('posts/', views.PostListCreateAPIView.as_view(), name='api_posts_list_create'),
    path('posts/<int:post_id>/', views.PostDetailUpdateDeleteAPIView.as_view(), name='api_post_detail'),
    path('posts/<int:post_id>/like/', views.PostLikeToggleAPIView.as_view(), name='api_post_like_toggle'),
    path('posts/<int:post_id>/save/', views.PostSaveToggleAPIView.as_view(), name='api_post_save_toggle'),
    path('posts/<int:post_id>/comments/', views.CommentListCreateAPIView.as_view(), name='api_post_comments'),
    path('comments/<int:comment_id>/', views.CommentDeleteAPIView.as_view(), name='api_comment_delete'),
    path('feed/widgets/', views.FeedSidebarWidgetsAPIView.as_view(), name='api_feed_widgets'),

    # Explore & Search
    path('explore/', views.ExploreAPIView.as_view(), name='api_explore'),
    path('search/', views.GlobalSearchAPIView.as_view(), name='api_search'),

    # Messaging
    path('messages/conversations/', views.ConversationListAPIView.as_view(), name='api_conversations_list'),
    path('messages/<str:username>/', views.ChatMessagesAPIView.as_view(), name='api_chat_messages'),

    # Notifications
    path('notifications/', views.NotificationListAPIView.as_view(), name='api_notifications_list'),
    path('notifications/mark-read/', views.MarkNotificationsReadAPIView.as_view(), name='api_notifications_mark_read'),

    # Recruitment
    path('recruitment/', views.RecruitmentListCreateAPIView.as_view(), name='api_recruitment_list_create'),
    path('recruitment/<int:post_id>/', views.RecruitmentDetailUpdateDeleteAPIView.as_view(), name='api_recruitment_detail'),
    path('recruitment/<int:post_id>/apply/', views.ApplyRecruitmentAPIView.as_view(), name='api_recruitment_apply'),
    path('recruitment/my-applications/', views.PlayerApplicationsAPIView.as_view(), name='api_my_applications'),
    path('club/dashboard/', views.ClubDashboardAPIView.as_view(), name='api_club_dashboard'),
    path('club/applications/<int:app_id>/status/', views.UpdateApplicationStatusAPIView.as_view(), name='api_update_application_status'),
    path('club/members/', views.ClubMemberManagementAPIView.as_view(), name='api_club_members'),
    path('club/members/<int:member_id>/', views.ClubMemberManagementAPIView.as_view(), name='api_club_member_delete'),

    # Tournaments
    path('tournaments/', views.TournamentListCreateAPIView.as_view(), name='api_tournaments_list_create'),
    path('tournaments/<int:tournament_id>/', views.TournamentDetailAPIView.as_view(), name='api_tournament_detail'),
    path('tournaments/<int:tournament_id>/register/', views.RegisterTournamentAPIView.as_view(), name='api_tournament_register'),
    path('tournaments/<int:tournament_id>/fixtures/generate/', views.GenerateFixturesAPIView.as_view(), name='api_tournament_generate_fixtures'),
    path('tournaments/matches/<int:match_id>/', views.UpdateMatchScoreAPIView.as_view(), name='api_tournament_match_score'),

    # Sponsorships
    path('sponsorships/', views.SponsorshipListCreateAPIView.as_view(), name='api_sponsorships_list_create'),
    path('sponsorships/<int:opp_id>/', views.SponsorshipDetailUpdateDeleteAPIView.as_view(), name='api_sponsorship_detail'),
    path('sponsorships/<int:opp_id>/apply/', views.ApplySponsorshipAPIView.as_view(), name='api_sponsorship_apply'),
    path('sponsorships/my-applications/', views.PlayerSponsorshipApplicationsAPIView.as_view(), name='api_my_sponsorship_applications'),
    path('sponsor/dashboard/', views.SponsorDashboardAPIView.as_view(), name='api_sponsor_dashboard'),
    path('sponsor/applications/<int:app_id>/status/', views.UpdateSponsorshipApplicationStatusAPIView.as_view(), name='api_update_sponsorship_status'),

    # Blogs
    path('blogs/', views.PublicBlogListAPIView.as_view(), name='api_blogs_list'),
    path('blogs/latest/', views.LatestBlogsAPIView.as_view(), name='api_blogs_latest'),
    path('blogs/<slug:slug>/', views.PublicBlogDetailAPIView.as_view(), name='api_blog_detail'),

    # Contact
    path('contact/', views.ContactSubmitAPIView.as_view(), name='api_contact_submit'),

    # Stories (Instagram-like Stories)
    path('stories/', views.StoryFeedTrayAPIView.as_view(), name='api_stories_tray'),
    path('stories/create/', views.StoryCreateAPIView.as_view(), name='api_stories_create'),
    path('stories/<int:story_id>/', views.StoryDetailAPIView.as_view(), name='api_story_detail'),
    path('stories/<int:story_id>/view/', views.StoryRecordViewAPIView.as_view(), name='api_story_view'),
    path('stories/<int:story_id>/viewers/', views.StoryViewersListAPIView.as_view(), name='api_story_viewers'),
    path('stories/user/<str:username>/', views.UserActiveStoriesAPIView.as_view(), name='api_user_stories'),

    # Admin Control Center (Superusers)
    path('admin/stats/', views.AdminStatsAPIView.as_view(), name='api_admin_stats'),
    path('admin/users/', views.AdminUsersListAPIView.as_view(), name='api_admin_users'),
    path('admin/users/<int:user_id>/', views.AdminUserUpdateAPIView.as_view(), name='api_admin_user_update'),
    path('admin/users/<int:user_id>/toggle-active/', views.AdminUserToggleActiveAPIView.as_view(), name='api_admin_user_toggle_active'),
    path('admin/users/<int:user_id>/toggle-verify/', views.AdminUserToggleVerifyAPIView.as_view(), name='api_admin_user_toggle_verify'),
    path('admin/users/<int:user_id>/delete/', views.AdminUserDeleteAPIView.as_view(), name='api_admin_user_delete'),
    path('admin/posts/', views.AdminPostsListAPIView.as_view(), name='api_admin_posts'),
    path('admin/comments/', views.AdminCommentsListAPIView.as_view(), name='api_admin_comments'),
    path('admin/messages/', views.AdminMessagesListAPIView.as_view(), name='api_admin_messages'),
    path('admin/notifications/', views.AdminNotificationsListAPIView.as_view(), name='api_admin_notifications'),
    path('admin/entities/<str:entity_type>/<int:entity_id>/delete/', views.AdminDeleteEntityAPIView.as_view(), name='api_admin_delete_entity'),
    path('admin/blogs/', views.AdminBlogListCreateAPIView.as_view(), name='api_admin_blogs'),
    path('admin/blogs/<int:blog_id>/', views.AdminBlogDetailUpdateDeleteAPIView.as_view(), name='api_admin_blog_detail'),
    path('admin/blogs/<int:blog_id>/toggle-publish/', views.AdminBlogTogglePublishAPIView.as_view(), name='api_admin_blog_toggle_publish'),
    path('admin/feedback/', views.AdminFeedbackListAPIView.as_view(), name='api_admin_feedback'),
    path('admin/feedback/<int:feedback_id>/toggle-read/', views.AdminFeedbackToggleReadAPIView.as_view(), name='api_admin_feedback_toggle_read'),
]
