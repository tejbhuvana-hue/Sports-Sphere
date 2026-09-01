import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI, getMediaUrl } from '../services/api';
import {
  StatsIcon,
  UsersGroupIcon,
  ShieldIcon,
  NewspaperIcon,
  BellIcon,
  TargetIcon,
  FileTextIcon,
  BriefcaseIcon,
  SearchIcon,
  FeedIcon,
  MessagesIcon,
  TrophyIcon,
  HandshakeIcon,
  ZapIcon,
  PencilIcon,
  TrashIcon,
  CloseIcon,
  MoreIcon,
  PlusIcon,
  UserIcon
} from '../components/common/Icons';

export const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'users' | 'content' | 'sports' | 'blogs' | 'feedback'
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  // Users section
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ username: '', email: '', role: '', is_active: true, is_verified: false });

  // Content moderation
  const [contentTab, setContentTab] = useState('posts'); // 'posts' | 'comments' | 'messages' | 'notifications'
  const [postsList, setPostsList] = useState([]);
  const [commentsList, setCommentsList] = useState([]);
  const [messagesList, setMessagesList] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);

  // Sports moderation
  const [sportsTab, setSportsTab] = useState('recruitment'); // 'recruitment' | 'tournaments' | 'sponsorships'
  const [recruitmentList, setRecruitmentList] = useState([]);
  const [tournamentsList, setTournamentsList] = useState([]);
  const [sponsorshipsList, setSponsorshipsList] = useState([]);

  // Blogs section
  const [blogsList, setBlogsList] = useState([]);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [blogForm, setBlogForm] = useState({ title: '', slug: '', short_description: '', content: '', is_published: true });
  const [blogImageFile, setBlogImageFile] = useState(null);

  // Feedback section
  const [feedbackList, setFeedbackList] = useState([]);

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await adminAPI.getStats();
      setStats(res.data || {});
    } catch (err) {
      console.error('Failed to load admin stats', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await adminAPI.getUsers(userRoleFilter);
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const fetchContent = async () => {
    try {
      const [pRes, cRes, mRes, nRes] = await Promise.all([
        adminAPI.getPosts(),
        adminAPI.getComments(),
        adminAPI.getMessages(),
        adminAPI.getNotifications(),
      ]);
      setPostsList(pRes.data.posts || []);
      setCommentsList(cRes.data.comments || []);
      setMessagesList(mRes.data.messages || []);
      setNotificationsList(nRes.data.notifications || []);
    } catch (err) {
      console.error('Failed to load content entities', err);
    }
  };

  const fetchBlogs = async () => {
    try {
      const res = await adminAPI.getBlogs();
      setBlogsList(res.data.blogs || []);
    } catch (err) {
      console.error('Failed to load blogs', err);
    }
  };

  const fetchFeedback = async () => {
    try {
      const res = await adminAPI.getFeedback();
      setFeedbackList(res.data.feedback || []);
    } catch (err) {
      console.error('Failed to load feedback', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchContent(),
        fetchBlogs(),
        fetchFeedback(),
      ]);
      setLoading(false);
    };
    loadAll();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [userRoleFilter]);

  // User Actions
  const handleToggleUserActive = async (userId) => {
    try {
      await adminAPI.toggleUserActive(userId);
      fetchUsers();
      fetchStats();
    } catch (err) {
      console.error('Toggle active error', err);
    }
  };

  const handleToggleUserVerify = async (userId) => {
    try {
      await adminAPI.toggleUserVerify(userId);
      fetchUsers();
    } catch (err) {
      console.error('Toggle verify error', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Permanently delete this user and all associated data?')) return;
    try {
      await adminAPI.deleteUser(userId);
      fetchUsers();
      fetchStats();
    } catch (err) {
      console.error('Delete user error', err);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await adminAPI.updateUser(editingUser.id, editUserForm);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Update user error', err);
    }
  };

  // Entity Deletion Action (Posts, Comments, Messages, Notifications, Recruitment, Tournaments, Sponsorships)
  const handleDeleteEntity = async (entityType, entityId) => {
    if (!window.confirm(`Permanently delete this ${entityType}?`)) return;
    try {
      await adminAPI.deleteEntity(entityType, entityId);
      fetchContent();
      fetchStats();
    } catch (err) {
      console.error('Delete entity error', err);
    }
  };

  // Blog Actions
  const handleToggleBlogPublish = async (blogId) => {
    try {
      await adminAPI.toggleBlogPublish(blogId);
      fetchBlogs();
      fetchStats();
    } catch (err) {
      console.error('Toggle publish error', err);
    }
  };

  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm('Permanently delete this blog article?')) return;
    try {
      await adminAPI.deleteBlog(blogId);
      fetchBlogs();
      fetchStats();
    } catch (err) {
      console.error('Delete blog error', err);
    }
  };

  const handleSaveBlog = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', blogForm.title);
      formData.append('slug', blogForm.slug || blogForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
      formData.append('short_description', blogForm.short_description);
      formData.append('content', blogForm.content);
      formData.append('is_published', blogForm.is_published);
      if (blogImageFile) formData.append('featured_image', blogImageFile);

      if (editingBlog) {
        await adminAPI.updateBlog(editingBlog.id, formData);
      } else {
        await adminAPI.createBlog(formData);
      }
      setShowBlogModal(false);
      setEditingBlog(null);
      setBlogForm({ title: '', slug: '', short_description: '', content: '', is_published: true });
      setBlogImageFile(null);
      fetchBlogs();
      fetchStats();
    } catch (err) {
      console.error('Save blog error', err);
    }
  };

  // Feedback Actions
  const handleToggleFeedbackRead = async (id) => {
    try {
      await adminAPI.toggleFeedbackRead(id);
      fetchFeedback();
      fetchStats();
    } catch (err) {
      console.error('Toggle read error', err);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="admin-body-container">
      {/* Admin Top Navigation */}
      <header className="admin-top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="admin-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MoreIcon size={20} />
          </button>
          <Link to="/admin-dashboard" className="admin-brand">
            Sports<span>Sphere</span>
            <span className="admin-badge-role">Super Admin</span>
          </Link>
        </div>

        <div className="admin-top-actions">
          <Link to="/" className="btn-admin-action" target="_blank">
            View Public Site
          </Link>
          <div className="admin-user-pill">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e676' }}></span>
            <span>{user?.username}</span>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/admin-login');
            }}
            className="btn-admin-action btn-admin-danger"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Admin Body Container */}
      <div className="admin-container">
        {/* Admin Sidebar */}
        <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="admin-menu-section">
            <div className="admin-menu-header">Dashboard</div>
            <button
              onClick={() => { setActiveSection('overview'); setSidebarOpen(false); }}
              className={`admin-nav-item ${activeSection === 'overview' ? 'active' : ''}`}
            >
              <span className="admin-nav-icon"><StatsIcon size={18} /></span>
              <span>Overview & Analytics</span>
            </button>
          </div>

          <div className="admin-menu-section">
            <div className="admin-menu-header">Management</div>
            <button
              onClick={() => { setActiveSection('users'); setSidebarOpen(false); }}
              className={`admin-nav-item ${activeSection === 'users' ? 'active' : ''}`}
            >
              <span className="admin-nav-icon"><UsersGroupIcon size={18} /></span>
              <span>User Control</span>
              <span className="admin-nav-badge">{stats.total_users || 0}</span>
            </button>
            <button
              onClick={() => { setActiveSection('content'); setSidebarOpen(false); }}
              className={`admin-nav-item ${activeSection === 'content' ? 'active' : ''}`}
            >
              <span className="admin-nav-icon"><ShieldIcon size={18} /></span>
              <span>Content Moderation</span>
            </button>
            <button
              onClick={() => { setActiveSection('blogs'); setSidebarOpen(false); }}
              className={`admin-nav-item ${activeSection === 'blogs' ? 'active' : ''}`}
            >
              <span className="admin-nav-icon"><NewspaperIcon size={18} /></span>
              <span>Editorial Blogs</span>
              <span className="admin-nav-badge">{stats.total_blogs || 0}</span>
            </button>
          </div>

          <div className="admin-menu-section">
            <div className="admin-menu-header">System</div>
            <button
              onClick={() => { setActiveSection('feedback'); setSidebarOpen(false); }}
              className={`admin-nav-item ${activeSection === 'feedback' ? 'active' : ''}`}
            >
              <span className="admin-nav-icon"><BellIcon size={18} /></span>
              <span>Inquiries & Feedback</span>
              {stats.unread_feedback_count > 0 && (
                <span className="admin-nav-badge" style={{ background: '#ff5252', color: '#fff' }}>
                  {stats.unread_feedback_count}
                </span>
              )}
            </button>
          </div>
        </aside>

        {/* Admin Main Content Area */}
        <main className="admin-main">
          {/* SECTION 1: OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="admin-section">
              <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '20px' }}>
                SportsSphere System Health & Metrics
              </h2>

              {/* 13 Stats Cards */}
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Total Users</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><UsersGroupIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_users || 0}</div>
                  <div className="admin-stat-sub">Active platform users</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Players</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><UserIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_players || 0}</div>
                  <div className="admin-stat-sub">Athletes enrolled</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Coaches</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><FileTextIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_coaches || 0}</div>
                  <div className="admin-stat-sub">Certified trainers</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Clubs</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><BriefcaseIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_clubs || 0}</div>
                  <div className="admin-stat-sub">Organizations registered</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Associations</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><ShieldIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_associations || 0}</div>
                  <div className="admin-stat-sub">Governing bodies</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Sponsors</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><BriefcaseIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_sponsors || 0}</div>
                  <div className="admin-stat-sub">Brands & partners</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Scouts</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><SearchIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_scouts || 0}</div>
                  <div className="admin-stat-sub">Talent evaluators</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Feed Posts</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><FeedIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_posts || 0}</div>
                  <div className="admin-stat-sub">Published status posts</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Comments</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><MessagesIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_comments || 0}</div>
                  <div className="admin-stat-sub">User interactions</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Tournaments</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><TrophyIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_tournaments || 0}</div>
                  <div className="admin-stat-sub">Championship leagues</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Recruitment Openings</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><TargetIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_recruitment_posts || 0}</div>
                  <div className="admin-stat-sub">Active club trials</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Sponsorship Deals</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><HandshakeIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_sponsorships || 0}</div>
                  <div className="admin-stat-sub">Active campaigns</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-title">Feedback Inquiries</span>
                    <span className="admin-stat-icon" style={{ color: 'var(--accent)' }}><BellIcon size={18} /></span>
                  </div>
                  <div className="admin-stat-number">{stats.total_feedback || 0}</div>
                  <div className="admin-stat-sub">{stats.unread_feedback_count || 0} Unread inquiries</div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="admin-panel">
                <div className="admin-panel-header">
                  <div className="admin-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ZapIcon size={18} /> Quick Management Shortcuts
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => setActiveSection('users')} className="btn-admin-action" style={{ padding: '10px 18px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <UsersGroupIcon size={16} /> Manage All Users
                  </button>
                  <button onClick={() => { setActiveSection('blogs'); setShowBlogModal(true); }} className="btn-admin-action" style={{ padding: '10px 18px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <PencilIcon size={16} /> Create Editorial Article
                  </button>
                  <button onClick={() => setActiveSection('content')} className="btn-admin-action" style={{ padding: '10px 18px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldIcon size={16} /> Moderate Feed Posts
                  </button>
                  <button onClick={() => setActiveSection('feedback')} className="btn-admin-action" style={{ padding: '10px 18px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <BellIcon size={16} /> Review User Feedback
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: USER CONTROL */}
          {activeSection === 'users' && (
            <div className="admin-section">
              <div className="admin-panel">
                <div className="admin-panel-header">
                  <div className="admin-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UsersGroupIcon size={18} /> User Management Center
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="admin-select-input"
                    >
                      <option value="">All Roles</option>
                      <option value="PLAYER">Players</option>
                      <option value="COACH">Coaches</option>
                      <option value="CLUB">Clubs</option>
                      <option value="ASSOCIATION">Associations</option>
                      <option value="SPONSOR">Sponsors</option>
                      <option value="SCOUT">Scouts</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search username or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="admin-search-input"
                    />
                  </div>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Verified</th>
                        <th>Active Status</th>
                        <th>Joined Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                              <Link to={`/profile/${u.username}`} target="_blank" style={{ color: '#fff', textDecoration: 'none' }}>
                                {u.username}
                              </Link>
                              {u.is_superuser && (
                                <span style={{ fontSize: '0.65rem', background: 'rgba(0, 217, 255, 0.2)', color: '#00d9ff', padding: '1px 5px', borderRadius: '4px' }}>
                                  ROOT
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{u.email}</td>
                          <td><span className="admin-badge-role">{u.role}</span></td>
                          <td>
                            <button
                              onClick={() => handleToggleUserVerify(u.id)}
                              className={`status-badge ${u.is_verified ? 'status-active' : 'status-read'}`}
                              style={{ cursor: 'pointer', border: 'none' }}
                            >
                              {u.is_verified ? '✓ Verified' : 'Standard'}
                            </button>
                          </td>
                          <td>
                            <button
                              onClick={() => handleToggleUserActive(u.id)}
                              className={`status-badge ${u.is_active ? 'status-active' : 'status-inactive'}`}
                              style={{ cursor: 'pointer', border: 'none' }}
                            >
                              {u.is_active ? 'Active' : 'Banned / Inactive'}
                            </button>
                          </td>
                          <td>{new Date(u.date_joined).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditUserForm({
                                    username: u.username,
                                    email: u.email,
                                    role: u.role,
                                    is_active: u.is_active,
                                    is_verified: u.is_verified,
                                  });
                                }}
                                className="btn-admin-action"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <PencilIcon size={13} /> Edit
                              </button>
                              {!u.is_superuser && (
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="btn-admin-action btn-admin-danger"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <TrashIcon size={13} /> Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: CONTENT MODERATION */}
          {activeSection === 'content' && (
            <div className="admin-section">
              <div className="admin-panel">
                <div className="admin-panel-header">
                  <div className="admin-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldIcon size={18} /> Content Moderation
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setContentTab('posts')} className={`btn-admin-action ${contentTab === 'posts' ? 'active' : ''}`}>
                      Posts ({postsList.length})
                    </button>
                    <button onClick={() => setContentTab('comments')} className={`btn-admin-action ${contentTab === 'comments' ? 'active' : ''}`}>
                      Comments ({commentsList.length})
                    </button>
                    <button onClick={() => setContentTab('messages')} className={`btn-admin-action ${contentTab === 'messages' ? 'active' : ''}`}>
                      Messages ({messagesList.length})
                    </button>
                    <button onClick={() => setContentTab('notifications')} className={`btn-admin-action ${contentTab === 'notifications' ? 'active' : ''}`}>
                      Notifications ({notificationsList.length})
                    </button>
                  </div>
                </div>

                {/* Posts Moderation Table */}
                {contentTab === 'posts' && (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Author</th>
                          <th>Content Snippet</th>
                          <th>Likes</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {postsList.map((p) => (
                          <tr key={p.id}>
                            <td><strong>{p.author?.username}</strong></td>
                            <td style={{ maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.content || (p.image ? '[Image Attachment]' : '[Video Attachment]')}
                            </td>
                            <td>Likes: {p.likes_count}</td>
                            <td>{new Date(p.created_at).toLocaleDateString()}</td>
                            <td>
                              <button onClick={() => handleDeleteEntity('post', p.id)} className="btn-admin-action btn-admin-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <TrashIcon size={13} /> Delete Post
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Comments Moderation Table */}
                {contentTab === 'comments' && (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Author</th>
                          <th>Comment Text</th>
                          <th>Post ID</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commentsList.map((c) => (
                          <tr key={c.id}>
                            <td><strong>{c.author?.username}</strong></td>
                            <td style={{ maxWidth: '360px' }}>{c.content}</td>
                            <td>#{c.post}</td>
                            <td>{new Date(c.created_at).toLocaleDateString()}</td>
                            <td>
                              <button onClick={() => handleDeleteEntity('comment', c.id)} className="btn-admin-action btn-admin-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <TrashIcon size={13} /> Delete Comment
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Messages Moderation Table */}
                {contentTab === 'messages' && (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Sender</th>
                          <th>Receiver</th>
                          <th>Content</th>
                          <th>Timestamp</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messagesList.map((m) => (
                          <tr key={m.id}>
                            <td><strong>{m.sender?.username}</strong></td>
                            <td><strong>{m.receiver?.username}</strong></td>
                            <td style={{ maxWidth: '300px' }}>{m.content || '[Image Attachment]'}</td>
                            <td>{new Date(m.timestamp).toLocaleString()}</td>
                            <td>
                              <button onClick={() => handleDeleteEntity('message', m.id)} className="btn-admin-action btn-admin-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <TrashIcon size={13} /> Delete Message
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Notifications Moderation Table */}
                {contentTab === 'notifications' && (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Recipient</th>
                          <th>Sender</th>
                          <th>Message</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notificationsList.map((n) => (
                          <tr key={n.id}>
                            <td><strong>{n.user}</strong></td>
                            <td>{n.sender?.username || 'System'}</td>
                            <td style={{ maxWidth: '360px' }}>{n.message}</td>
                            <td>{new Date(n.created_at).toLocaleString()}</td>
                            <td>
                              <button onClick={() => handleDeleteEntity('notification', n.id)} className="btn-admin-action btn-admin-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <TrashIcon size={13} /> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: EDITORIAL BLOGS */}
          {activeSection === 'blogs' && (
            <div className="admin-section">
              <div className="admin-panel">
                <div className="admin-panel-header">
                  <div className="admin-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <NewspaperIcon size={18} /> Editorial Article Management
                  </div>
                  <button
                    onClick={() => {
                      setEditingBlog(null);
                      setBlogForm({ title: '', slug: '', short_description: '', content: '', is_published: true });
                      setBlogImageFile(null);
                      setShowBlogModal(true);
                    }}
                    className="btn-admin-action"
                    style={{ background: '#00d9ff', color: '#081426', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <PlusIcon size={16} /> Create New Blog
                  </button>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Status</th>
                        <th>Created Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blogsList.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <strong>{b.title}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>/{b.slug}</div>
                          </td>
                          <td>{b.author?.username}</td>
                          <td>
                            <button
                              onClick={() => handleToggleBlogPublish(b.id)}
                              className={`status-badge ${b.is_published ? 'status-published' : 'status-draft'}`}
                              style={{ cursor: 'pointer', border: 'none' }}
                            >
                              {b.is_published ? '✓ Published' : 'Draft'}
                            </button>
                          </td>
                          <td>{new Date(b.created_at).toLocaleDateString()}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => {
                                  setEditingBlog(b);
                                  setBlogForm({
                                    title: b.title,
                                    slug: b.slug,
                                    short_description: b.short_description || '',
                                    content: b.content || '',
                                    is_published: b.is_published,
                                  });
                                  setShowBlogModal(true);
                                }}
                                className="btn-admin-action"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <PencilIcon size={13} /> Edit
                              </button>
                              <button onClick={() => handleDeleteBlog(b.id)} className="btn-admin-action btn-admin-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <TrashIcon size={13} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {blogsList.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--admin-text-muted)' }}>
                            No blog posts created yet. Click "+ Create New Blog" to write the first article!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: FEEDBACK */}
          {activeSection === 'feedback' && (
            <div className="admin-section">
              <div className="admin-panel">
                <div className="admin-panel-header">
                  <div className="admin-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BellIcon size={18} /> User Contact & Inquiries
                  </div>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbackList.map((f) => (
                        <tr key={f.id}>
                          <td>
                            <button
                              onClick={() => handleToggleFeedbackRead(f.id)}
                              className={`status-badge ${f.is_read ? 'status-read' : 'status-unread'}`}
                              style={{ cursor: 'pointer', border: 'none' }}
                            >
                              {f.is_read ? 'Read' : 'New'}
                            </button>
                          </td>
                          <td><strong>{f.name}</strong></td>
                          <td>{f.email}</td>
                          <td><strong>{f.subject}</strong></td>
                          <td style={{ maxWidth: '300px' }}>{f.message}</td>
                          <td>{new Date(f.created_at).toLocaleDateString()}</td>
                          <td>
                            <button onClick={() => handleDeleteEntity('contact_message', f.id)} className="btn-admin-action btn-admin-danger">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {feedbackList.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--admin-text-muted)' }}>
                            No contact inquiries received yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="admin-modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <button className="admin-modal-close" onClick={() => setEditingUser(null)}><CloseIcon size={18} /></button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Edit User: @{editingUser.username}
            </h3>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Username</label>
                <input
                  type="text"
                  required
                  value={editUserForm.username}
                  onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
                  className="admin-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  required
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="admin-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Role</label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                  className="admin-select-input"
                  style={{ width: '100%' }}
                >
                  <option value="PLAYER">PLAYER</option>
                  <option value="COACH">COACH</option>
                  <option value="CLUB">CLUB</option>
                  <option value="ASSOCIATION">ASSOCIATION</option>
                  <option value="SPONSOR">SPONSOR</option>
                  <option value="SCOUT">SCOUT</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editUserForm.is_active}
                    onChange={(e) => setEditUserForm({ ...editUserForm, is_active: e.target.checked })}
                  />
                  Active Account
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editUserForm.is_verified}
                    onChange={(e) => setEditUserForm({ ...editUserForm, is_verified: e.target.checked })}
                  />
                  Verified Checkmark
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Blog Modal */}
      {showBlogModal && (
        <div className="admin-modal-overlay" onClick={() => setShowBlogModal(false)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <button className="admin-modal-close" onClick={() => setShowBlogModal(false)}><CloseIcon size={18} /></button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
              {editingBlog ? 'Edit Editorial Blog' : 'Create New Article'}
            </h3>

            <form onSubmit={handleSaveBlog} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Article Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 Modern Scouting Metrics That Club Directors Watch"
                  value={blogForm.title}
                  onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                  className="admin-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>URL Slug</label>
                <input
                  type="text"
                  placeholder="e.g. 5-modern-scouting-metrics"
                  value={blogForm.slug}
                  onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                  className="admin-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Featured Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBlogImageFile(e.target.files[0])}
                  className="admin-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Summary / Short Description</label>
                <textarea
                  rows={2}
                  placeholder="Quick summary shown on cards..."
                  value={blogForm.short_description}
                  onChange={(e) => setBlogForm({ ...blogForm, short_description: e.target.value })}
                  className="admin-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Content (HTML / Markdown)</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Write the full article content here..."
                  value={blogForm.content}
                  onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                  className="admin-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={blogForm.is_published}
                  onChange={(e) => setBlogForm({ ...blogForm, is_published: e.target.checked })}
                />
                Publish Article Immediately
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowBlogModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingBlog ? 'Update Article' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
