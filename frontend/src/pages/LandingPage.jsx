import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogsAPI, getMediaUrl } from '../services/api';
import {
  FeedIcon,
  UserIcon,
  HandshakeIcon,
  TargetIcon,
  TrophyIcon,
  BriefcaseIcon,
  MessagesIcon,
  FileTextIcon,
  NewspaperIcon,
  CalendarIcon,
  ChevronRightIcon
} from '../components/common/Icons';

export const LandingPage = () => {
  const [latestBlogs, setLatestBlogs] = useState([]);

  useEffect(() => {
    const fetchLatestBlogs = async () => {
      try {
        const res = await blogsAPI.getLatestBlogs();
        setLatestBlogs(res.data || []);
      } catch (err) {
        console.warn('Failed to load latest blogs', err);
      }
    };
    fetchLatestBlogs();
  }, []);

  return (
    <div className="landing-wrapper">
      {/* HERO SECTION */}
      <section className="hero-section" id="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-logo">Sports<span>Sphere</span></h1>
          <h2 className="hero-tagline">Where Athletes Connect, Grow, Compete and Get Discovered</h2>
          <p className="hero-desc">
            SportsSphere is the ultimate sports networking ecosystem. We blend the social excitement of Instagram with the career opportunities of LinkedIn, built entirely for players, coaches, clubs, associations, sponsors, and scouts.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary btn-lg-glow">Login</Link>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="landing-section" id="about">
        <div className="section-container">
          <span className="section-subtitle">Who We Are</span>
          <h3 className="section-title">Bridging the Gap in Sports Business</h3>
          <div className="about-grid">
            <div className="about-text glass-panel">
              <p>
                Historically, athletes struggled to find official pathways, clubs had difficulty sourcing tested recruits, and sponsors lacked structured discovery tools. SportsSphere solves this by connecting all six main sports actors into one fluid platform.
              </p>
              <p>
                Whether you are a player showcasing a video highlight, a coach endorsing a standout player, a club coordinating a national trial, or a corporate sponsor searching for brand ambassadors, SportsSphere provides the custom interfaces and channels to make it happen.
              </p>
            </div>
            <div className="about-badge-decor">
              <div className="glow-sphere"></div>
              <div className="stat-circle">
                <span className="circle-number">100%</span>
                <span className="circle-label">Sports Ecosystem</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KEY FEATURES SECTION */}
      <section className="landing-section" id="features">
        <div className="section-container">
          <span className="section-subtitle">Core Features</span>
          <h3 className="section-title">Built for Performance</h3>
          <div className="features-grid">
            <div className="feature-card-item glass-panel">
              <div className="feature-icon" style={{ color: 'var(--accent)' }}>
                <FeedIcon size={32} />
              </div>
              <h4 className="feature-card-title">Sports Social Feed</h4>
              <p className="feature-card-desc">Share training highlights, match clips, and status updates. Follow top athletes and trending topics.</p>
            </div>

            <div className="feature-card-item glass-panel">
              <div className="feature-icon" style={{ color: 'var(--accent)' }}>
                <UserIcon size={32} />
              </div>
              <h4 className="feature-card-title">Athlete Profiles</h4>
              <p className="feature-card-desc">Showcase your bio, locations, and sports roles. Verified accounts display professional checkmark badges.</p>
            </div>

            <div className="feature-card-item glass-panel">
              <div className="feature-icon" style={{ color: 'var(--accent)' }}>
                <HandshakeIcon size={32} />
              </div>
              <h4 className="feature-card-title">Coach Network</h4>
              <p className="feature-card-desc">Connect with certified trainers and scouts. Get direct trait endorsements and custom recommendations.</p>
            </div>

            <div className="feature-card-item glass-panel">
              <div className="feature-icon" style={{ color: 'var(--accent)' }}>
                <TargetIcon size={32} />
              </div>
              <h4 className="feature-card-title">Club Recruitment</h4>
              <p className="feature-card-desc">Clubs post active trials and recruitment ads. Players upload resumes/certificates to apply directly.</p>
            </div>

            <div className="feature-card-item glass-panel">
              <div className="feature-icon" style={{ color: 'var(--accent)' }}>
                <TrophyIcon size={32} />
              </div>
              <h4 className="feature-card-title">Tournament Management</h4>
              <p className="feature-card-desc">Host leagues, register club teams, generate round-robin fixtures, and track live standings tables.</p>
            </div>

            <div className="feature-card-item glass-panel">
              <div className="feature-icon" style={{ color: 'var(--accent)' }}>
                <BriefcaseIcon size={32} />
              </div>
              <h4 className="feature-card-title">Sponsorship Marketplace</h4>
              <p className="feature-card-desc">Sponsors launch campaigns. Players pitch their profiles directly, with built-in dashboard workflow controls.</p>
            </div>

            <div className="feature-card-item glass-panel">
              <div className="feature-icon" style={{ color: 'var(--accent)' }}>
                <MessagesIcon size={32} />
              </div>
              <h4 className="feature-card-title">Messaging System</h4>
              <p className="feature-card-desc">Fast direct messages with instant read status checkmarks, online user states, and image attachments.</p>
            </div>

            <div className="feature-card-item glass-panel">
              <div className="feature-icon" style={{ color: 'var(--accent)' }}>
                <FileTextIcon size={32} />
              </div>
              <h4 className="feature-card-title">Professional Sports Resume</h4>
              <p className="feature-card-desc">Document career history, clubs played, achievements, UEFA/soccer licenses, and season metrics.</p>
            </div>
          </div>
        </div>
      </section>

      {/* USER ROLES SECTION */}
      <section className="landing-section" id="roles">
        <div className="section-container">
          <span className="section-subtitle">Custom Experiences</span>
          <h3 className="section-title">Tailored for Your Role</h3>
          <div className="roles-grid">
            <div className="role-card glass-panel">
              <div className="role-badge">Player</div>
              <p className="role-desc">Upload trials documentation, build your athletic resume, gain trait endorsements, and pitch to premium sponsors.</p>
            </div>

            <div className="role-card glass-panel">
              <div className="role-badge">Coach</div>
              <p className="role-desc">Train and guide prospective talent, endorse player traits, write recommendations, and scout collegiate players.</p>
            </div>

            <div className="role-card glass-panel">
              <div className="role-badge">Club</div>
              <p className="role-desc">Publish academy entry trials, review player applications, manage team rosters, and compete in cups.</p>
            </div>

            <div className="role-card glass-panel">
              <div className="role-badge">Association</div>
              <p className="role-desc">Govern local soccer and athletic tournaments, coordinate match structures, and oversee clubs registers.</p>
            </div>

            <div className="role-card glass-panel">
              <div className="role-badge">Sponsor</div>
              <p className="role-desc">Promote corporate brand campaigns, approve athlete ambassadors proposals, and track marketing channels.</p>
            </div>

            <div className="role-card glass-panel">
              <div className="role-badge">Scout</div>
              <p className="role-desc">Search profiles with precise sports filters (position, location, performance metrics), and message talent.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY SPORTSSPHERE SECTION */}
      <section className="landing-section" id="why">
        <div className="section-container">
          <span className="section-subtitle">Benefits</span>
          <h3 className="section-title">Why Choose SportsSphere?</h3>
          <div className="why-list-grid">
            <div className="why-item">
              <span className="why-number">01</span>
              <div>
                <h5 className="why-headline">Discover Talent</h5>
                <p className="why-text">Scout matches and athletes globally using data-driven statistics and search metrics.</p>
              </div>
            </div>
            <div className="why-item">
              <span className="why-number">02</span>
              <div>
                <h5 className="why-headline">Build Connections</h5>
                <p className="why-text">Connect directly with industry figures without brokers or intermediary fees.</p>
              </div>
            </div>
            <div className="why-item">
              <span className="why-number">03</span>
              <div>
                <h5 className="why-headline">Join Tournaments</h5>
                <p className="why-text">Access real-time competition listings and registers in your regional area.</p>
              </div>
            </div>
            <div className="why-item">
              <span className="why-number">04</span>
              <div>
                <h5 className="why-headline">Find Sponsors</h5>
                <p className="why-text">Open monetization streams via Nike, Adidas, and hydration partnerships campaign offers.</p>
              </div>
            </div>
            <div className="why-item">
              <span className="why-number">05</span>
              <div>
                <h5 className="why-headline">Grow Your Career</h5>
                <p className="why-text">Establish an online sports identity that acts as your professional sports portfolio.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTICS SECTION */}
      <section className="landing-section stats-bg">
        <div className="section-container">
          <div className="stats-grid">
            <div className="stat-counter-box glass-panel">
              <span className="stat-count-num">15,200+</span>
              <span className="stat-count-lbl">Registered Athletes</span>
            </div>
            <div className="stat-counter-box glass-panel">
              <span className="stat-count-num">1,450+</span>
              <span className="stat-count-lbl">Coaches</span>
            </div>
            <div className="stat-counter-box glass-panel">
              <span className="stat-count-num">820+</span>
              <span className="stat-count-lbl">Clubs Registered</span>
            </div>
            <div className="stat-counter-box glass-panel">
              <span className="stat-count-num">340+</span>
              <span className="stat-count-lbl">Tournaments Hosted</span>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="landing-section" id="testimonials">
        <div className="section-container">
          <span className="section-subtitle">Success Stories</span>
          <h3 className="section-title">What Our Community Says</h3>
          <div className="testimonials-grid">
            <div className="testimonial-card glass-panel">
              <div className="testi-header">
                <span className="testi-quote-mark">“</span>
                <div className="testi-author">
                  <h5 className="testi-name">Alex Johnson</h5>
                  <span className="testi-role">Player, Real Athletic</span>
                </div>
              </div>
              <p className="testi-text">
                SportsSphere changed my career pathway entirely. By showcasing my goals and having Coach Elena endorse my skillsets, I was scouted by Real Athletic within two months!
              </p>
            </div>

            <div className="testimonial-card glass-panel">
              <div className="testi-header">
                <span className="testi-quote-mark">“</span>
                <div className="testi-author">
                  <h5 className="testi-name">Elena Rostova</h5>
                  <span className="testi-role">UEFA B Coach</span>
                </div>
              </div>
              <p className="testi-text">
                Recruiting players has never been this straightforward. I can review sports resumes, view training statistics, and coordinate matches all inside one ecosystem.
              </p>
            </div>

            <div className="testimonial-card glass-panel">
              <div className="testi-header">
                <span className="testi-quote-mark">“</span>
                <div className="testi-author">
                  <h5 className="testi-name">Marcus Vance</h5>
                  <span className="testi-role">Nike Marketing Manager</span>
                </div>
              </div>
              <p className="testi-text">
                Launching ambassador sponsorships campaigns is incredibly efficient. The proposal feed lets us quickly screen applicants and approve pitches in-place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LATEST BLOGS SECTION (Dynamic from Django API) */}
      <section className="landing-section" id="blogs">
        <div className="section-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="section-subtitle">Sports Insights & News</span>
              <h3 className="section-title" style={{ marginBottom: 0 }}>Latest Blogs</h3>
            </div>
            <Link to="/blogs" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              See More Blogs <ChevronRightIcon size={16} />
            </Link>
          </div>

          {latestBlogs.length > 0 ? (
            <div className="blogs-grid">
              {latestBlogs.map((blog) => (
                <article key={blog.id} className="blog-card glass-panel">
                  {blog.featured_image_url ? (
                    <div className="blog-card-media">
                      <img src={blog.featured_image_url} alt={blog.title} className="blog-card-img" loading="lazy" />
                    </div>
                  ) : (
                    <div className="blog-card-media blog-card-placeholder">
                      <span className="blog-placeholder-icon" style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <NewspaperIcon size={36} />
                      </span>
                    </div>
                  )}
                  <div className="blog-card-body">
                    <div className="blog-meta-row">
                      <span className="blog-date" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CalendarIcon size={12} /> {new Date(blog.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {blog.author && (
                        <span className="blog-author" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserIcon size={12} /> {blog.author.username}
                        </span>
                      )}
                    </div>
                    <h4 className="blog-card-title">{blog.title}</h4>
                    <p className="blog-card-desc">
                      {blog.short_description || blog.content?.replace(/<[^>]+>/g, '').slice(0, 120) + '...'}
                    </p>
                    <div className="blog-card-footer">
                      <Link to={`/blogs/${blog.slug}`} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Read More <ChevronRightIcon size={15} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 'var(--border-radius)', border: '1px dashed var(--border-subtle)' }}>
              <NewspaperIcon size={44} className="empty-icon" />
              <h4 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px' }}>No Articles Published Yet</h4>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 20px' }}>
                Check back soon for the latest sports updates, player guides, training tips, and industry insights!
              </p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link to="/blogs" className="btn btn-secondary btn-lg">See More Blogs</Link>
          </div>
        </div>
      </section>

      {/* CONTACT CTA SECTION */}
      <section className="landing-section cta-section">
        <div className="cta-overlay"></div>
        <div className="cta-content">
          <h3 className="cta-headline">Ready to Join SportsSphere?</h3>
          <p className="cta-subtitle">Connect with scouts, register for championships, or partner with premium global brands today.</p>
          <div className="cta-buttons">
            <Link to="/login" className="btn btn-primary btn-lg-glow">Login</Link>
          </div>
        </div>
      </section>
    </div>
  );
};
