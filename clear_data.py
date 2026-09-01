import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sports_sphere.settings')
django.setup()

from core.models import (
    Post, Comment, Notification, Message, Follow, RecruitmentPost,
    Application, ClubMember, Tournament, Match, SponsorshipOpportunity,
    SponsorshipApplication, ResumeExperience, ResumeAchievement,
    ResumeCertificate, ResumeStatistic, Endorsement, Recommendation,
    ContactMessage, Blog, User
)

models_to_clear = [
    ("Comments", Comment),
    ("Notifications", Notification),
    ("Direct Messages", Message),
    ("Follows / Connections", Follow),
    ("Posts (and Likes/Saves)", Post),
    ("Blogs", Blog),
    ("Sponsorship Applications", SponsorshipApplication),
    ("Sponsorship Opportunities", SponsorshipOpportunity),
    ("Trial / Recruitment Applications", Application),
    ("Recruitment Posts", RecruitmentPost),
    ("Club Memberships", ClubMember),
    ("Tournament Matches", Match),
    ("Tournaments", Tournament),
    ("Resume Experiences", ResumeExperience),
    ("Resume Achievements", ResumeAchievement),
    ("Resume Certificates", ResumeCertificate),
    ("Resume Statistics", ResumeStatistic),
    ("Coach Endorsements", Endorsement),
    ("Recommendations", Recommendation),
    ("Contact Inquiries", ContactMessage),
]

print("=== CLEARING DATA ===")
for name, model in models_to_clear:
    count_before = model.objects.count()
    model.objects.all().delete()
    print(f"Cleared {name}: {count_before} deleted.")

# Clear any lingering M2M relationships on users if any
admin_user = User.objects.filter(username='teja').first()
if admin_user:
    admin_user.liked_posts.clear()
    admin_user.saved_posts.clear()
    admin_user.followers.clear()

print("\n=== POST-CLEANUP STATUS ===")
for name, model in models_to_clear:
    print(f"{name}: {model.objects.count()} records remaining.")
print(f"Users remaining: {User.objects.count()} ({[u.username for u in User.objects.all()]})")
