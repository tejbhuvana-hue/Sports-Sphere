import axios from "axios";

const API_BASE_URL = import.meta.env.DEV
  ? "/api"
  : (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "https://sports-sphere-cfcv.onrender.com/api").replace(/\/+$/, "");

export const MEDIA_BASE_URL = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_MEDIA_BASE_URL || import.meta.env.MEDIA_BASE_URL || "https://sports-sphere-cfcv.onrender.com").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to attach Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle unauthenticated 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired or invalid, optionally clean token
      if (localStorage.getItem("token")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    return Promise.reject(error);
  },
);

// Helpers to format image/media URLs
export const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${MEDIA_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

// API Methods
export const authAPI = {
  register: (data) => api.post("/auth/register/", data),
  requestRegistrationOTP: (data) =>
    api.post("/auth/register/request-otp/", data),
  verifyRegistrationOTP: (data) =>
    api.post("/auth/register/verify-otp/", data),
  resendRegistrationOTP: (data) =>
    api.post("/auth/register/resend-otp/", data),
  login: (data) => api.post("/auth/login/", data),
  googleAuth: (data) => api.post("/auth/google/", data),
  logout: (fcmToken) =>
    api.post("/auth/logout/", fcmToken ? { token: fcmToken } : {}),
  getCurrentUser: () => api.get("/auth/me/"),
  passwordReset: (data) => api.post("/auth/password-reset/", data),
};

export const deviceTokensAPI = {
  registerToken: (token) => api.post("/device-tokens/", { token }),
  deleteToken: (token) => api.delete("/device-tokens/", { data: { token } }),
};

export const profilesAPI = {
  getProfile: (username) => api.get(`/profiles/${username}/`),
  updateProfile: (formData) =>
    api.patch("/profiles/update/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  toggleVerification: () => api.post("/profiles/toggle-verify/"),
  addResumeItem: (itemType, data) =>
    api.post(`/profiles/resume/${itemType}/`, data),
  deleteResumeItem: (itemType, itemId) =>
    api.delete(`/profiles/resume/${itemType}/${itemId}/`),
  toggleEndorsement: (playerId, category) =>
    api.post(`/profiles/${playerId}/endorse/${category}/`),
  addRecommendation: (playerId, data) =>
    api.post(`/profiles/${playerId}/recommend/`, data),
};

export const followsAPI = {
  toggleFollow: (userId) => api.post(`/follows/${userId}/toggle/`),
  getFollowers: (username) => api.get(`/follows/${username}/followers/`),
  getFollowing: (username) => api.get(`/follows/${username}/following/`),
};

export const postsAPI = {
  getPosts: (params) => api.get("/posts/", { params }),
  getPost: (postId) => api.get(`/posts/${postId}/`),
  createPost: (formData) =>
    api.post("/posts/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updatePost: (postId, formData) =>
    api.patch(`/posts/${postId}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deletePost: (postId) => api.delete(`/posts/${postId}/`),
  toggleLike: (postId) => api.post(`/posts/${postId}/like/`),
  toggleSave: (postId) => api.post(`/posts/${postId}/save/`),
  getComments: (postId) => api.get(`/posts/${postId}/comments/`),
  createComment: (postId, data) => api.post(`/posts/${postId}/comments/`, data),
  deleteComment: (commentId) => api.delete(`/comments/${commentId}/`),
  getWidgets: () => api.get("/feed/widgets/"),
};

export const exploreAPI = {
  getExplore: (query) => api.get("/explore/", { params: { q: query } }),
  search: (params) => api.get("/search/", { params }),
};

export const messagesAPI = {
  getConversations: () => api.get("/messages/conversations/"),
  getChat: (username) => api.get(`/messages/${username}/`),
  sendMessage: (username, formData) =>
    api.post(`/messages/${username}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export const notificationsAPI = {
  getNotifications: () => api.get("/notifications/"),
  markAsRead: () => api.post("/notifications/mark-read/"),
  clearAll: () => api.delete("/notifications/clear/"),
  deleteNotification: (id) => api.delete(`/notifications/${id}/`),
};

export const recruitmentAPI = {
  getListings: (params) => api.get("/recruitment/", { params }),
  getListing: (id) => api.get(`/recruitment/${id}/`),
  createListing: (data) => api.post("/recruitment/", data),
  updateListing: (id, data) => api.patch(`/recruitment/${id}/`, data),
  deleteListing: (id) => api.delete(`/recruitment/${id}/`),
  apply: (id, formData) =>
    api.post(`/recruitment/${id}/apply/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getMyApplications: () => api.get("/recruitment/my-applications/"),
  getClubDashboard: () => api.get("/club/dashboard/"),
  updateApplicationStatus: (appId, status) =>
    api.post(`/club/applications/${appId}/status/`, { status }),
  addClubMember: (playerId) =>
    api.post("/club/members/", { player_id: playerId }),
  removeClubMember: (memberId) => api.delete(`/club/members/${memberId}/`),
};

export const tournamentsAPI = {
  getTournaments: (params) => api.get("/tournaments/", { params }),
  getTournament: (id) => api.get(`/tournaments/${id}/`),
  createTournament: (data) => api.post("/tournaments/", data),
  registerTeam: (id) => api.post(`/tournaments/${id}/register/`),
  generateFixtures: (id) => api.post(`/tournaments/${id}/fixtures/generate/`),
  updateMatchScore: (matchId, data) =>
    api.post(`/tournaments/matches/${matchId}/`, data),
};

export const sponsorshipsAPI = {
  getOpportunities: (params) => api.get("/sponsorships/", { params }),
  getOpportunity: (id) => api.get(`/sponsorships/${id}/`),
  createOpportunity: (data) => api.post("/sponsorships/", data),
  updateOpportunity: (id, data) => api.patch(`/sponsorships/${id}/`, data),
  deleteOpportunity: (id) => api.delete(`/sponsorships/${id}/`),
  apply: (id, data) => api.post(`/sponsorships/${id}/apply/`, data),
  getMyApplications: () => api.get("/sponsorships/my-applications/"),
  getSponsorDashboard: () => api.get("/sponsor/dashboard/"),
  updateApplicationStatus: (appId, status) =>
    api.post(`/sponsor/applications/${appId}/status/`, { status }),
};

export const blogsAPI = {
  getBlogs: () => api.get("/blogs/"),
  getLatestBlogs: () => api.get("/blogs/latest/"),
  getBlogDetail: (slug) => api.get(`/blogs/${slug}/`),
};

export const storiesAPI = {
  getStoriesTray: () => api.get("/stories/"),
  getStory: (id) => api.get(`/stories/${id}/`),
  createStory: (data) => api.post("/stories/", data),
  deleteStory: (id) => api.delete(`/stories/${id}/`),
  viewStory: (id) => api.post(`/stories/${id}/view/`),
  getStoryViewers: (id) => api.get(`/stories/${id}/viewers/`),
  getUserStories: (username) => api.get(`/stories/user/${username}/`),
};

export const contactAPI = {
  submitContact: (data) => api.post("/contact/", data),
};

export const adminAPI = {
  getStats: () => api.get("/admin/stats/"),
  getUsers: (role) => api.get("/admin/users/", { params: { role } }),
  updateUser: (userId, data) => api.patch(`/admin/users/${userId}/`, data),
  toggleUserActive: (userId) =>
    api.post(`/admin/users/${userId}/toggle-active/`),
  toggleUserVerify: (userId) =>
    api.post(`/admin/users/${userId}/toggle-verify/`),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}/delete/`),
  getPosts: () => api.get("/admin/posts/"),
  getComments: () => api.get("/admin/comments/"),
  getMessages: () => api.get("/admin/messages/"),
  getNotifications: () => api.get("/admin/notifications/"),
  deleteEntity: (entityType, entityId) =>
    api.delete(`/admin/entities/${entityType}/${entityId}/delete/`),
  getBlogs: () => api.get("/admin/blogs/"),
  createBlog: (formData) =>
    api.post("/admin/blogs/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateBlog: (blogId, formData) =>
    api.patch(`/admin/blogs/${blogId}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteBlog: (blogId) => api.delete(`/admin/blogs/${blogId}/`),
  toggleBlogPublish: (blogId) =>
    api.post(`/admin/blogs/${blogId}/toggle-publish/`),
  getFeedback: () => api.get("/admin/feedback/"),
  toggleFeedbackRead: (id) => api.post(`/admin/feedback/${id}/toggle-read/`),
};

export default api;
