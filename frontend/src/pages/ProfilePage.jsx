import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { profilesAPI, followsAPI, postsAPI, getMediaUrl } from '../services/api';
import { PostCard } from '../components/PostCard';
import { EndorsementChips } from '../components/EndorsementChips';
import {
  AddExperienceModal,
  AddAchievementModal,
  AddCertificateModal,
  AddStatisticModal,
} from '../components/ResumeModals';
import { RecommendationModal } from '../components/RecommendationModal';
import {
  PencilIcon,
  PlusIcon,
  MapPinIcon,
  CalendarIcon,
  BriefcaseIcon,
  AwardIcon,
  CertificateIcon,
  StatsIcon,
  RecommendationIcon,
  TrashIcon,
  CloseIcon,
  CheckVerifiedIcon,
  MessagesIcon,
  UserIcon,
  FeedIcon
} from '../components/common/Icons';

export const ProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const targetUsername = username || currentUser?.username;

  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' | 'posts'
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Modals
  const [showExpModal, setShowExpModal] = useState(false);
  const [showAchModal, setShowAchModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showStatModal, setShowStatModal] = useState(false);
  const [showRecModal, setShowRecModal] = useState(false);

  const isOwnProfile = Boolean(
    currentUser &&
    (currentUser.username?.toLowerCase() === targetUsername?.toLowerCase() ||
     currentUser.id === profileData?.user?.id)
  );

  const fetchProfile = async () => {
    if (!targetUsername) return;
    setLoading(true);
    try {
      const [profileRes, postsRes] = await Promise.allSettled([
        profilesAPI.getProfile(targetUsername),
        postsAPI.getPosts({ author: targetUsername }),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        setProfileData(profileRes.value.data);
        setIsFollowing(profileRes.value.data.user?.is_following || false);
        setFollowersCount(profileRes.value.data.user?.followers_count || 0);
        setFollowingCount(profileRes.value.data.user?.following_count || 0);
      } else {
        setProfileData(null);
      }

      if (postsRes.status === 'fulfilled') {
        setPosts(postsRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load profile', err);
      setProfileData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [targetUsername, currentUser?.username]);

  const handleFollowToggle = async () => {
    if (!isAuthenticated || !profileData?.user?.id) return;
    try {
      const res = await followsAPI.toggleFollow(profileData.user.id);
      setIsFollowing(res.data.followed);
      setFollowersCount(res.data.followers_count);
    } catch (err) {
      console.error('Follow toggle error', err);
    }
  };

  const handleDeleteResumeItem = async (itemType, itemId) => {
    if (!window.confirm('Delete this resume item?')) return;
    try {
      await profilesAPI.deleteResumeItem(itemType, itemId);
      fetchProfile();
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading-state" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <div className="reels-spinner" style={{ marginRight: '10px' }}></div>
        Loading profile...
      </div>
    );
  }

  if (!profileData || !profileData.user) {
    return (
      <div className="glass-panel profile-not-found" style={{ maxWidth: '500px', margin: '40px auto', padding: '32px', textAlign: 'center', borderRadius: '16px' }}>
        <h3 className="not-found-title" style={{ fontSize: '1.25rem', marginBottom: '8px' }}>User Not Found</h3>
        <p className="not-found-desc" style={{ color: 'var(--text-secondary)', marginBottom: '18px' }}>
          The user @{targetUsername} could not be found on SportsSphere.
        </p>
        <Link to="/feed" className="btn btn-primary btn-sm">Return to Feed</Link>
      </div>
    );
  }

  const { user: profileUser, portfolio = {} } = profileData;
  const profile = profileUser.profile || {};
  const bannerUrl = profile.cover_banner ? getMediaUrl(profile.cover_banner) : null;
  const avatarUrl = profile.profile_picture ? getMediaUrl(profile.profile_picture) : null;

  return (
    <div className="profile-container">
      {/* Profile Header Card */}
      <div className="glass-panel profile-header-card">
        {/* Banner */}
        <div
          className="profile-cover-banner"
          style={{
            background: bannerUrl ? `url(${bannerUrl}) center/cover no-repeat` : 'var(--profile-cover-bg)',
          }}
        >
          {profile.is_online && (
            <span className="profile-online-badge">
              Online
            </span>
          )}
        </div>

        {/* Profile Info Header */}
        <div className="profile-header-content">
          <div className="profile-main-info-row">
            <div className="profile-avatar-block">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profileUser.username}
                  className="profile-avatar-img"
                />
              ) : (
                <div className="profile-avatar-fallback">
                  {profileUser.username.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="profile-identity">
                <h2 className="profile-display-name">
                  {profileUser.first_name || profileUser.last_name
                    ? `${profileUser.first_name} ${profileUser.last_name}`.trim()
                    : profileUser.username}
                  {profileUser.is_verified && <CheckVerifiedIcon size={18} className="verified-badge" />}
                </h2>
                <div className="profile-role-tag">
                  @{profileUser.username} • <span style={{ textTransform: 'capitalize' }}>{profileUser.role?.toLowerCase()}</span>
                  {profile.sport && ` • ${profile.sport}`}
                </div>
                {profile.location && (
                  <div className="profile-location-text">
                    <MapPinIcon size={14} /> {profile.location}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="profile-action-buttons">
              {isOwnProfile ? (
                <Link to="/profile/edit" className="btn btn-secondary btn-sm profile-edit-btn">
                  <PencilIcon size={15} /> Edit Profile
                </Link>
              ) : (
                <>
                  <button
                    onClick={handleFollowToggle}
                    className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'} btn-sm profile-follow-btn`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <Link to={`/messages/${profileUser.username}`} className="btn btn-secondary btn-sm profile-msg-btn">
                    <MessagesIcon size={15} /> Message
                  </Link>
                  {currentUser?.role in { COACH: 1, CLUB: 1 } && profileUser.role === 'PLAYER' && (
                    <button onClick={() => setShowRecModal(true)} className="btn btn-secondary btn-sm profile-rec-btn">
                      <RecommendationIcon size={15} /> Recommend
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="profile-bio-text">
              {profile.bio}
            </p>
          )}

          {/* Social Media Stats Bar: Posts | Followers | Following */}
          <div className="profile-stats-bar">
            <div className="profile-stat-box">
              <span className="stat-count">{posts.length}</span>
              <span className="stat-label">Posts</span>
            </div>
            <Link to={`/followers/${profileUser.username}`} className="profile-stat-box link">
              <span className="stat-count">{followersCount}</span>
              <span className="stat-label">Followers</span>
            </Link>
            <Link to={`/following/${profileUser.username}`} className="profile-stat-box link">
              <span className="stat-count">{followingCount}</span>
              <span className="stat-label">Following</span>
            </Link>
          </div>

          {/* Endorsements for Players */}
          {profileUser.role === 'PLAYER' && (
            <div className="profile-endorsements-section">
              <div className="endorsements-title-row">
                <span className="endorsements-title">Coach Trait Endorsements</span>
              </div>
              <EndorsementChips
                playerId={profileUser.id}
                endorsementsCounts={portfolio.endorsements_counts}
                userEndorsements={portfolio.user_endorsements}
                isOwnProfile={isOwnProfile}
              />
            </div>
          )}
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="profile-tabs-bar">
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`profile-tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
        >
          {profileUser.role === 'PLAYER' ? 'Sports Resume & Career' : 'Profile Details'}
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          className={`profile-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
        >
          Posts ({posts.length})
        </button>
      </div>

      {/* Tab 1: Portfolio / Resume Details */}
      {activeTab === 'portfolio' && (
        <div className="profile-tab-content">
          {/* PLAYER PORTFOLIO RESUME */}
          {profileUser.role === 'PLAYER' ? (
            <div className="portfolio-sections-list">
              {/* Career Experience */}
              <div className="glass-panel resume-section-card">
                <div className="resume-section-header">
                  <div className="resume-section-title-wrap">
                    <BriefcaseIcon size={20} className="resume-section-icon" />
                    <h3 className="resume-section-title">Career & Clubs History</h3>
                    <span className="resume-count-badge">{portfolio.experiences?.length || 0}</span>
                  </div>
                  {isOwnProfile && (
                    <button onClick={() => setShowExpModal(true)} className="btn btn-primary btn-sm resume-add-btn">
                      <PlusIcon size={16} /> Add Experience
                    </button>
                  )}
                </div>
                {portfolio.experiences?.length > 0 ? (
                  <div className="resume-items-list">
                    {portfolio.experiences.map((exp) => (
                      <div key={exp.id} className="resume-item-card">
                        <div className="resume-item-info">
                          <div className="resume-item-title">{exp.role}</div>
                          <div className="resume-item-subtitle">{exp.club_name}</div>
                          <div className="resume-item-date">
                            <CalendarIcon size={14} /> {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
                          </div>
                          {exp.description && (
                            <div className="resume-item-desc">
                              {exp.description}
                            </div>
                          )}
                        </div>
                        {isOwnProfile && (
                          <button onClick={() => handleDeleteResumeItem('experience', exp.id)} className="delete-item-btn" title="Delete experience">
                            <TrashIcon size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="resume-empty-card">
                    <p className="resume-empty-hint">No club experiences added yet.</p>
                    {isOwnProfile && (
                      <button onClick={() => setShowExpModal(true)} className="btn btn-secondary btn-sm resume-empty-action-btn">
                        <PlusIcon size={15} /> Add First Experience
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Achievements */}
              <div className="glass-panel resume-section-card">
                <div className="resume-section-header">
                  <div className="resume-section-title-wrap">
                    <AwardIcon size={20} className="resume-section-icon" />
                    <h3 className="resume-section-title">Honors & Achievements</h3>
                    <span className="resume-count-badge">{portfolio.achievements?.length || 0}</span>
                  </div>
                  {isOwnProfile && (
                    <button onClick={() => setShowAchModal(true)} className="btn btn-primary btn-sm resume-add-btn">
                      <PlusIcon size={16} /> Add Achievement
                    </button>
                  )}
                </div>
                {portfolio.achievements?.length > 0 ? (
                  <div className="achievements-grid">
                    {portfolio.achievements.map((ach) => (
                      <div key={ach.id} className="achievement-card">
                        <div className="achievement-title">{ach.title}</div>
                        <div className="achievement-year">Year: {ach.year}</div>
                        {ach.description && <div className="achievement-desc">{ach.description}</div>}
                        {isOwnProfile && (
                          <button onClick={() => handleDeleteResumeItem('achievement', ach.id)} className="delete-item-corner-btn" title="Delete achievement">
                            <CloseIcon size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="resume-empty-card">
                    <p className="resume-empty-hint">No achievements listed yet.</p>
                    {isOwnProfile && (
                      <button onClick={() => setShowAchModal(true)} className="btn btn-secondary btn-sm resume-empty-action-btn">
                        <PlusIcon size={15} /> Add First Achievement
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Certifications */}
              <div className="glass-panel resume-section-card">
                <div className="resume-section-header">
                  <div className="resume-section-title-wrap">
                    <CertificateIcon size={20} className="resume-section-icon" />
                    <h3 className="resume-section-title">Licenses & Certifications</h3>
                    <span className="resume-count-badge">{portfolio.certificates?.length || 0}</span>
                  </div>
                  {isOwnProfile && (
                    <button onClick={() => setShowCertModal(true)} className="btn btn-primary btn-sm resume-add-btn">
                      <PlusIcon size={16} /> Add Certificate
                    </button>
                  )}
                </div>
                {portfolio.certificates?.length > 0 ? (
                  <div className="certificates-grid">
                    {portfolio.certificates.map((cert) => (
                      <div key={cert.id} className="certificate-card">
                        <div className="certificate-name">{cert.name}</div>
                        <div className="certificate-authority">Authority: {cert.authority}</div>
                        <div className="certificate-date">
                          <CalendarIcon size={14} /> {cert.issue_date} {cert.credential_id ? `• ID: ${cert.credential_id}` : ''}
                        </div>
                        {isOwnProfile && (
                          <button onClick={() => handleDeleteResumeItem('certificate', cert.id)} className="delete-item-corner-btn" title="Delete certification">
                            <CloseIcon size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="resume-empty-card">
                    <p className="resume-empty-hint">No certifications uploaded yet.</p>
                    {isOwnProfile && (
                      <button onClick={() => setShowCertModal(true)} className="btn btn-secondary btn-sm resume-empty-action-btn">
                        <PlusIcon size={15} /> Add First Certificate
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Performance Metrics */}
              <div className="glass-panel resume-section-card">
                <div className="resume-section-header">
                  <div className="resume-section-title-wrap">
                    <StatsIcon size={20} className="resume-section-icon" />
                    <h3 className="resume-section-title">Performance Statistics</h3>
                    <span className="resume-count-badge">{portfolio.statistics?.length || 0}</span>
                  </div>
                  {isOwnProfile && (
                    <button onClick={() => setShowStatModal(true)} className="btn btn-primary btn-sm resume-add-btn">
                      <PlusIcon size={16} /> Add Metric
                    </button>
                  )}
                </div>
                {portfolio.statistics?.length > 0 ? (
                  <div className="stats-metric-grid">
                    {portfolio.statistics.map((stat) => (
                      <div key={stat.id} className="stat-metric-card">
                        <div className="stat-metric-value">{stat.value}</div>
                        <div className="stat-metric-name">{stat.name}</div>
                        {stat.season && <div className="stat-metric-season">{stat.season}</div>}
                        {isOwnProfile && (
                          <button onClick={() => handleDeleteResumeItem('statistic', stat.id)} className="delete-item-corner-btn" title="Delete statistic">
                            <CloseIcon size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="resume-empty-card">
                    <p className="resume-empty-hint">No statistics logged yet.</p>
                    {isOwnProfile && (
                      <button onClick={() => setShowStatModal(true)} className="btn btn-secondary btn-sm resume-empty-action-btn">
                        <PlusIcon size={15} /> Add First Metric
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div className="glass-panel resume-section-card">
                <div className="resume-section-header">
                  <div className="resume-section-title-wrap">
                    <RecommendationIcon size={20} className="resume-section-icon" />
                    <h3 className="resume-section-title">Coach Recommendations</h3>
                    <span className="resume-count-badge">{portfolio.recommendations?.length || 0}</span>
                  </div>
                </div>
                {portfolio.recommendations?.length > 0 ? (
                  <div className="recommendations-list">
                    {portfolio.recommendations.map((rec) => (
                      <div key={rec.id} className="recommendation-card">
                        <div className="rec-header">
                          <Link to={`/profile/${rec.coach?.username}`} className="rec-author">
                            {rec.coach?.username}
                          </Link>
                          <span className="rec-rel">{rec.relationship}</span>
                        </div>
                        <p className="rec-text">"{rec.content}"</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="resume-empty-card">
                    <p className="resume-empty-hint">No recommendations received yet.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* NON-PLAYER PROFILE DETAILS (Coaches, Clubs, Sponsors) */
            <div className="glass-panel details-card">
              <h3 className="details-title">Organization & Professional Info</h3>
              <div className="details-grid">
                <div className="detail-field">
                  <span className="detail-label">Role</span>
                  <span className="detail-value">{profileUser.role}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Sport</span>
                  <span className="detail-value">{profile.sport || 'Not specified'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{profile.location || 'Not specified'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Email Contact</span>
                  <span className="detail-value">{profileUser.email}</span>
                </div>
                {profile.website && (
                  <div className="detail-field">
                    <span className="detail-label">Website</span>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="detail-link">
                      {profile.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Posts */}
      {activeTab === 'posts' && (
        <div className="profile-tab-content">
          {posts.length > 0 ? (
            <div className="profile-posts-stream">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostDeleted={(postId) => setPosts(posts.filter((p) => p.id !== postId))}
                />
              ))}
            </div>
          ) : (
            <div className="glass-panel profile-no-posts">
              <UserIcon size={36} className="empty-icon" />
              <h4 className="empty-title">No Posts Yet</h4>
              <p className="empty-desc">
                @{profileUser.username} hasn't published any posts or media highlights.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modals for adding resume items */}
      <AddExperienceModal
        isOpen={showExpModal}
        onClose={() => setShowExpModal(false)}
        onItemAdded={fetchProfile}
      />
      <AddAchievementModal
        isOpen={showAchModal}
        onClose={() => setShowAchModal(false)}
        onItemAdded={fetchProfile}
      />
      <AddCertificateModal
        isOpen={showCertModal}
        onClose={() => setShowCertModal(false)}
        onItemAdded={fetchProfile}
      />
      <AddStatisticModal
        isOpen={showStatModal}
        onClose={() => setShowStatModal(false)}
        onItemAdded={fetchProfile}
      />
      <RecommendationModal
        isOpen={showRecModal}
        onClose={() => setShowRecModal(false)}
        playerId={profileUser.id}
        playerName={profileUser.username}
        onRecommendationAdded={fetchProfile}
      />
    </div>
  );
};
