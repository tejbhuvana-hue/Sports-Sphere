from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Profile, Post, Comment, Notification, Message, RecruitmentPost, Application, ClubMember, Tournament, Match, SponsorshipOpportunity, SponsorshipApplication, ResumeExperience, ResumeAchievement, ResumeCertificate, ResumeStatistic, Endorsement, Recommendation
from PIL import Image, ImageDraw
import io
from django.core.files.base import ContentFile

User = get_user_model()

def create_solid_image(color, width=300, height=300, label=""):
    # Create simple solid color image with Pillow
    img = Image.new('RGB', (width, height), color=color)
    draw = ImageDraw.Draw(img)
    # Draw simple cross/border inside the image to look like a placeholder
    draw.rectangle([10, 10, width-10, height-10], outline=(255, 255, 255), width=2)
    # Draw text in the middle if possible
    draw.text((20, height//2 - 10), label, fill=(255, 255, 255))
    
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return ContentFile(buf.read(), name=f"{label.lower().replace(' ', '_')}.png")

class Command(BaseCommand):
    help = "Seeds the database with high-quality mock data for SportsSphere Phase 1."

    def handle(self, *args, **kwargs):
        self.stdout.write("Cleaning database...")
        Recommendation.objects.all().delete()
        Endorsement.objects.all().delete()
        ResumeStatistic.objects.all().delete()
        ResumeCertificate.objects.all().delete()
        ResumeAchievement.objects.all().delete()
        ResumeExperience.objects.all().delete()
        SponsorshipApplication.objects.all().delete()
        SponsorshipOpportunity.objects.all().delete()
        Match.objects.all().delete()
        Tournament.objects.all().delete()
        ClubMember.objects.all().delete()
        Application.objects.all().delete()
        RecruitmentPost.objects.all().delete()
        Message.objects.all().delete()
        Comment.objects.all().delete()
        Post.objects.all().delete()
        Notification.objects.all().delete()
        User.objects.all().delete()
        
        self.stdout.write("Creating mock users...")
        
        # User Roles: PLAYER, COACH, CLUB, ASSOCIATION, SPONSOR, SCOUT
        
        # 1. Players
        u_alex = User.objects.create_user(
            username='Player_Alex',
            email='alex@sportssphere.com',
            password='SportsSphere2026',
            role=User.Role.PLAYER
        )
        p_alex = u_alex.profile
        p_alex.location = 'Los Angeles, CA'
        p_alex.bio = 'Striker for LA Academy. Scouted by national teams. Focusing on speed drills and ball manipulation.'
        p_alex.sport = 'Soccer'
        p_alex.position = 'Center Forward'
        p_alex.achievements = 'Top Scorer 2025 Regional League (24 goals)\nMVP Golden Boot Award 2025'
        p_alex.profile_picture.save('alex_avatar.png', create_solid_image('#00D9FF', 150, 150, "Alex (Player)"))
        p_alex.cover_banner.save('alex_banner.png', create_solid_image('#0D1B33', 800, 200, "Alex Cover"))
        p_alex.save()

        u_serena = User.objects.create_user(
            username='Player_Serena',
            email='serena@sportssphere.com',
            password='SportsSphere2026',
            role=User.Role.PLAYER
        )
        p_serena = u_serena.profile
        p_serena.location = 'Miami, FL'
        p_serena.bio = 'Junior Tennis Champion. Currently playing division 1 tournaments. Always aiming for the baseline.'
        p_serena.sport = 'Tennis'
        p_serena.position = 'Singles / Doubles'
        p_serena.achievements = 'U18 National Finals Finalist\nSunshine State Open Gold Medalist'
        p_serena.profile_picture.save('serena_avatar.png', create_solid_image('#FF007F', 150, 150, "Serena (Player)"))
        p_serena.save()

        # 2. Coach
        u_elena = User.objects.create_user(
            username='Coach_Elena',
            email='elena@sportssphere.com',
            password='SportsSphere2026',
            role=User.Role.COACH
        )
        p_elena = u_elena.profile
        p_elena.location = 'Chicago, IL'
        p_elena.bio = 'UEFA B License holder. Over 10 years coaching youth soccer clubs and high-performance academies.'
        p_elena.certifications = 'UEFA B Coaching License\nUS Soccer National Youth License'
        p_elena.experience = 'Head Coach - Chicago Junior Soccer Academy (2020 - Present)\nYouth Trainer - Midwest United (2015-2020)'
        p_elena.profile_picture.save('elena_avatar.png', create_solid_image('#FF9900', 150, 150, "Elena (Coach)"))
        p_elena.save()

        # 3. Scout
        u_david = User.objects.create_user(
            username='Scout_David',
            email='david@sportssphere.com',
            password='SportsSphere2026',
            role=User.Role.SCOUT
        )
        p_david = u_david.profile
        p_david.location = 'Dallas, TX'
        p_david.bio = 'Independent Scout for MLS and Collegiate leagues. Looking for high work-rate players with good spatial intelligence.'
        p_david.recruitment_profile = 'Primary Focus: North American Under-19 Soccer\nPosition Demands: Striker, Central Midfielder, Wingback'
        p_david.profile_picture.save('david_avatar.png', create_solid_image('#33CC33', 150, 150, "David (Scout)"))
        p_david.save()

        # 4. Club
        u_real = User.objects.create_user(
            username='Club_Real_Athletic',
            email='real@sportssphere.com',
            password='SportsSphere2026',
            role=User.Role.CLUB
        )
        p_real = u_real.profile
        p_real.location = 'Houston, TX'
        p_real.bio = 'Championship Club focusing on grass-roots player pathways to professional levels.'
        p_real.club_info = 'Est: 2012\nFacilities: 4 Natural grass pitches, 1 Professional Gym\nTeams: U14, U16, U18, and Senior Squads'
        p_real.profile_picture.save('real_avatar.png', create_solid_image('#9900CC', 150, 150, "Real Club"))
        p_real.save()

        u_houston = User.objects.create_user(
            username='Club_Houston_Stars',
            email='houston@sportssphere.com',
            password='SportsSphere2026',
            role=User.Role.CLUB
        )
        p_houston = u_houston.profile
        p_houston.location = 'Houston, TX'
        p_houston.bio = 'Elite soccer club with a long history of competitive development.'
        p_houston.club_info = 'Est: 2015\nFacilities: 2 Grass fields\nTeams: U16, U18'
        p_houston.profile_picture.save('houston_avatar.png', create_solid_image('#CC0066', 150, 150, "Houston Stars"))
        p_houston.save()

        u_dallas = User.objects.create_user(
            username='Club_Dallas_FC',
            email='dallas@sportssphere.com',
            password='SportsSphere2026',
            role=User.Role.CLUB
        )
        p_dallas = u_dallas.profile
        p_dallas.location = 'Dallas, TX'
        p_dallas.bio = 'Committed to excellence on and off the soccer field.'
        p_dallas.club_info = 'Est: 2010\nFacilities: 3 Synthetic pitches\nTeams: U18, Senior Squads'
        p_dallas.profile_picture.save('dallas_avatar.png', create_solid_image('#009999', 150, 150, "Dallas FC"))
        p_dallas.save()

        u_austin = User.objects.create_user(
            username='Club_Austin_United',
            email='austin@sportssphere.com',
            password='SportsSphere2026',
            role=User.Role.CLUB
        )
        p_austin = u_austin.profile
        p_austin.location = 'Austin, TX'
        p_austin.bio = 'Fostering local soccer talent and community engagement.'
        p_austin.club_info = 'Est: 2018\nFacilities: 1 Main Stadium, 2 Practice pitches\nTeams: Senior Squads'
        p_austin.profile_picture.save('austin_avatar.png', create_solid_image('#E6B800', 150, 150, "Austin United"))
        p_austin.save()

        # 5. Sponsor
        u_nike = User.objects.create_user(
            username='Sponsor_Nike',
            email='nike@sportssphere.com',
            password='SportsSphere2026',
            role=User.Role.SPONSOR
        )
        p_nike = u_nike.profile
        p_nike.location = 'Beaverton, OR'
        p_nike.bio = 'Nike Sponsorship Department. Championing young athletic talent worldwide. Just Do It.'
        p_nike.company_name = 'Nike, Inc.'
        p_nike.company_website = 'https://www.nike.com'
        p_nike.company_industry = 'Sports Apparel & Equipment'
        p_nike.company_profile = 'Target Audience: Young athletes with 500+ followers\nCampaigns: NextGen Footwear, Apparel sponsorships'
        p_nike.profile_picture.save('nike_avatar.png', create_solid_image('#111111', 150, 150, "Nike Corp"))
        p_nike.save()

        # 6. Association
        u_assoc = User.objects.create_user(
            username='Association_USYS',
            email='usys@sportssphere.com',
            password='SportsSphere2026',
            role=User.Role.ASSOCIATION
        )
        p_assoc = u_assoc.profile
        p_assoc.location = 'Frisco, TX'
        p_assoc.bio = 'United States Youth Soccer Association. Fostering development and growth of youth soccer leagues.'
        p_assoc.org_info = 'Members: 3 Million+ registered players\nLeagues: State Cups, National League, President Cup'
        p_assoc.profile_picture.save('usys_avatar.png', create_solid_image('#003399', 150, 150, "US Youth Soccer"))
        p_assoc.save()

        self.stdout.write("Establishing follower relations...")
        # David follows Alex
        u_david.following.add(u_alex)
        # Elena follows Alex
        u_elena.following.add(u_alex)
        # Alex follows Elena and Serena
        u_alex.following.add(u_elena)
        u_alex.following.add(u_serena)
        # Serena follows Alex
        u_serena.following.add(u_alex)

        self.stdout.write("Creating mock posts...")
        # Post 1: Alex (Player)
        post_alex = Post.objects.create(
            author=u_alex,
            content="Hard work beats talent when talent doesn't work hard. Great session today finishing some dynamic shooting drill drills. Checked in with a top scoring rate! ⚽🎯"
        )
        post_alex.image.save('alex_post_img.png', create_solid_image('#005577', 600, 350, "Training Session"))
        post_alex.likes.add(u_david)
        post_alex.likes.add(u_elena)
        
        # Add comment
        Comment.objects.create(
            post=post_alex,
            author=u_elena,
            content="Superb form, Alex! Keep working on that quick release. Let's review it next training."
        )
        Comment.objects.create(
            post=post_alex,
            author=u_david,
            content="Great finishing capability. Let's chat next week, Alex."
        )

        # Post 2: Serena (Player)
        post_serena = Post.objects.create(
            author=u_serena,
            content="Stoked to win the regional quarterfinals! Baseline rallies were intense. On to the semifinals on Thursday! 🎾🏆"
        )
        post_serena.image.save('serena_post_img.png', create_solid_image('#770033', 600, 350, "Match Point"))
        post_serena.likes.add(u_alex)
        post_serena.likes.add(u_nike)
        
        Comment.objects.create(
            post=post_serena,
            author=u_alex,
            content="Absolute machine! Congrats and good luck in the semis!"
        )

        # Post 3: Elena (Coach)
        post_elena = Post.objects.create(
            author=u_elena,
            content="Tactical drills are key. We are reviewing defensive transitions in today's training. Players, make sure to read the positioning analysis sheet."
        )

        # Post 4: Nike (Sponsor)
        post_nike = Post.objects.create(
            author=u_nike,
            content="We are officially launching the NextGen Athlete sponsorship program. Apply through the Sponsorships page on your sidebar. Show us what you have got! #JustDoIt"
        )
        post_nike.likes.add(u_alex)
        post_nike.likes.add(u_serena)

        self.stdout.write("Generating mock notifications...")
        # Create unread notifications for Alex
        Notification.objects.create(
            recipient=u_alex,
            sender=u_david,
            notification_type=Notification.NotificationType.FOLLOW
        )
        Notification.objects.create(
            recipient=u_alex,
            sender=u_david,
            notification_type=Notification.NotificationType.LIKE,
            post=post_alex
        )
        Notification.objects.create(
            recipient=u_alex,
            sender=u_elena,
            notification_type=Notification.NotificationType.COMMENT,
            post=post_alex
        )

        self.stdout.write("Creating mock chat logs...")
        # Direct messaging history between David and Alex
        Message.objects.create(
            sender=u_david,
            recipient=u_alex,
            content="Hello Alex! I saw your recent performance clips on SportsSphere. Truly exceptional work."
        )
        Message.objects.create(
            sender=u_alex,
            recipient=u_david,
            content="Hi David! Thank you so much, I really appreciate you taking the time to look at them."
        )
        Message.objects.create(
            sender=u_david,
            recipient=u_alex,
            content="Absolutely. We are currently searching for prospects for regional trials next month. Are you open to discussing opportunities?"
        )
        Message.objects.create(
            sender=u_alex,
            recipient=u_david,
            content="Definitely. I'd love to join a call or send over my full athletic dossier."
        )
        Message.objects.create(
            sender=u_david,
            recipient=u_alex,
            content="Great! Let's schedule a call for next week. How does Tuesday afternoon sound?"
        )

        self.stdout.write("Creating mock recruitment listings...")
        import datetime
        
        post_striker = RecruitmentPost.objects.create(
            club=u_real,
            title="Lead Striker Wanted (Under-19)",
            sport="Soccer",
            description="Real Athletic is seeking an agile, high-performance center forward striker for our national tournament roster. Candidates should demonstrate excellent off-the-ball movement, finishing skills, and quick tactical transitions. High youth academy work rate expected.",
            location="Houston, TX",
            last_date=datetime.date(2026, 7, 15)
        )
        
        post_midfield = RecruitmentPost.objects.create(
            club=u_real,
            title="Central Defensive Midfielder",
            sport="Soccer",
            description="We have an opening for a technical defensive midfielder with superb distribution, ball interception capability, and high defensive work-rate. UEFA training/academy experience is highly preferred.",
            location="Houston, TX",
            last_date=datetime.date(2026, 8, 1)
        )

        self.stdout.write("Creating mock player applications...")
        resume_content = b"%PDF-1.4 Mock Player Resume content..."
        resume_file = ContentFile(resume_content, name="alex_soccer_resume.pdf")
        
        # Player Alex applies to Under-19 Striker
        app_alex = Application.objects.create(
            post=post_striker,
            player=u_alex,
            resume=resume_file,
            status=Application.ApplicationStatus.PENDING
        )
        
        # Player Serena applies to Central Midfielder
        cert_content = b"%PDF-1.4 Mock tennis certificate content..."
        cert_file = ContentFile(cert_content, name="serena_tennis_cert.pdf")
        app_serena = Application.objects.create(
            post=post_midfield,
            player=u_serena,
            resume=resume_file,
            certificates=cert_file,
            status=Application.ApplicationStatus.PENDING
        )
        
        self.stdout.write("Establishing initial club membership rosters...")
        ClubMember.objects.create(
            club=u_real,
            player=u_alex
        )

        self.stdout.write("Creating mock tournaments...")
        tourney = Tournament.objects.create(
            creator=u_assoc,
            name="Texas Youth Champions Cup",
            sport="Soccer",
            venue="Toyota Center, Houston, TX",
            description="The premier youth soccer championship tournament in Texas, featuring elite club teams competing in a round-robin format.",
            start_date=datetime.date(2026, 6, 20),
            end_date=datetime.date(2026, 6, 28)
        )
        # Register the 4 clubs
        tourney.registered_teams.add(u_real, u_houston, u_dallas, u_austin)

        self.stdout.write("Creating tournament match fixtures and seeding scores...")
        # Seeding completed and scheduled fixtures
        m1 = Match.objects.create(
            tournament=tourney,
            home_team=u_real,
            away_team=u_houston,
            match_date=datetime.datetime.combine(datetime.date(2026, 6, 20), datetime.time(15, 0)),
            home_score=2,
            away_score=1,
            is_completed=True
        )
        m2 = Match.objects.create(
            tournament=tourney,
            home_team=u_real,
            away_team=u_dallas,
            match_date=datetime.datetime.combine(datetime.date(2026, 6, 21), datetime.time(15, 0)),
            home_score=1,
            away_score=1,
            is_completed=True
        )
        m3 = Match.objects.create(
            tournament=tourney,
            home_team=u_houston,
            away_team=u_austin,
            match_date=datetime.datetime.combine(datetime.date(2026, 6, 22), datetime.time(15, 0)),
            home_score=0,
            away_score=3,
            is_completed=True
        )
        m4 = Match.objects.create(
            tournament=tourney,
            home_team=u_dallas,
            away_team=u_austin,
            match_date=datetime.datetime.combine(datetime.date(2026, 6, 23), datetime.time(15, 0)),
            home_score=2,
            away_score=2,
            is_completed=True
        )
        m5 = Match.objects.create(
            tournament=tourney,
            home_team=u_real,
            away_team=u_austin,
            match_date=datetime.datetime.combine(datetime.date(2026, 6, 24), datetime.time(15, 0)),
            is_completed=False
        )
        m6 = Match.objects.create(
            tournament=tourney,
            home_team=u_houston,
            away_team=u_dallas,
            match_date=datetime.datetime.combine(datetime.date(2026, 6, 25), datetime.time(15, 0)),
            is_completed=False
        )

        self.stdout.write("Creating mock sponsorship opportunities and athlete pitches...")
        # 1. Opportunity: Nike Brand Ambassador
        opp_nike = SponsorshipOpportunity.objects.create(
            sponsor=u_nike,
            title="NextGen Footwear Brand Ambassador",
            sport_category="Soccer",
            budget="$1,500 / month + Gear Support",
            description="Nike is looking for active soccer players to join our NextGen program as brand ambassadors. Selected athletes will receive free training kits, footwear, and travel stipends for national tournaments. In return, we expect monthly social posts showcasing training routines in Nike gear.",
            eligibility="Active youth or collegiate soccer player, age 16-22, minimum 500+ followers on SportsSphere or Instagram."
        )

        # 2. Opportunity: Apex Hydration Ambassador
        opp_hydration = SponsorshipOpportunity.objects.create(
            sponsor=u_nike,
            title="Elite Athletes Hydration Campaign",
            sport_category="All Sports",
            budget="$500 / month + Energy Drinks",
            description="Seeking high-performance athletes across all sports to promote the new Apex Hydration line. We provide monthly cases of hydration drinks and brand merchandise.",
            eligibility="Must participate in competitive local leagues or championships. Open to players of all sports."
        )

        # Seeding player applications:
        # Player Alex applies to opp_nike (status: ACCEPTED)
        SponsorshipApplication.objects.create(
            opportunity=opp_nike,
            player=u_alex,
            message="Hi Nike Team! I'm the top scorer of the Texas Youth League with 24 goals. I have 1,200+ followers and always wear Nike Mercurial boots. I'd love to represent the brand!",
            status=SponsorshipApplication.ApplicationStatus.ACCEPTED
        )
        
        # Player Serena applies to opp_hydration (status: PENDING)
        SponsorshipApplication.objects.create(
            opportunity=opp_hydration,
            player=u_serena,
            message="Hey there! I am a division 1 tennis competitor. Staying hydrated is core to my baseline performance, and I'd love to partner with Apex Hydration.",
            status=SponsorshipApplication.ApplicationStatus.PENDING
        )

        # Seeding Phase 6: Verification, Resume, Endorsements, Recommendations
        self.stdout.write("Seeding Phase 6 portfolio and verification details...")
        u_alex.is_verified = True
        u_alex.save()
        u_elena.is_verified = True
        u_elena.save()
        u_nike.is_verified = True
        u_nike.save()
        u_real.is_verified = True
        u_real.save()

        # Resume Experience
        ResumeExperience.objects.create(
            player=u_alex,
            role="Center Forward / Striker",
            club_name="LA Academy Youth Squad",
            start_date=datetime.date(2024, 1, 1),
            end_date=datetime.date(2025, 12, 31),
            is_current=False,
            description="Participated in national youth transition championships. Formulated advanced off-the-ball runs, scoring 24 goals."
        )
        ResumeExperience.objects.create(
            player=u_alex,
            role="Starting Striker",
            club_name="Real Athletic Roster",
            start_date=datetime.date(2026, 1, 1),
            is_current=True,
            description="Leading forward in the local round-robin competitions."
        )

        # Resume Achievements
        ResumeAchievement.objects.create(
            player=u_alex,
            title="Golden Boot Trophy Regional MVP",
            year=2025,
            description="Recognized as regional MVP with 24 goals in 18 competitive games."
        )

        # Resume Certificates
        ResumeCertificate.objects.create(
            player=u_alex,
            name="US Youth Soccer Elite Cadet Certificate",
            authority="US Youth Soccer Association",
            issue_date=datetime.date(2025, 6, 15),
            credential_id="USYS-ELITE-99882"
        )

        # Resume Statistics
        ResumeStatistic.objects.create(player=u_alex, name="Goals Scored", value="24", season="2025")
        ResumeStatistic.objects.create(player=u_alex, name="Assists", value="12", season="2025")
        ResumeStatistic.objects.create(player=u_alex, name="Shot Accuracy", value="68.5%", season="2025")
        ResumeStatistic.objects.create(player=u_alex, name="Matches Played", value="18", season="2025")

        # Endorsements
        Endorsement.objects.create(player=u_alex, coach=u_elena, category=Endorsement.Category.LEADERSHIP)
        Endorsement.objects.create(player=u_alex, coach=u_elena, category=Endorsement.Category.SKILLS)
        Endorsement.objects.create(player=u_alex, coach=u_elena, category=Endorsement.Category.FITNESS)

        # Recommendations
        Recommendation.objects.create(
            player=u_alex,
            author=u_elena,
            relationship="Academy Head Coach",
            content="Alex has shown tremendous focus, finishing capability, and sportsmanship. His athletic intelligence is top-tier."
        )
        Recommendation.objects.create(
            player=u_alex,
            author=u_real,
            relationship="Club Director",
            content="Alex has seamlessly integrated into the Real Athletic pathway. Highly professional and dedicated player."
        )

        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))
