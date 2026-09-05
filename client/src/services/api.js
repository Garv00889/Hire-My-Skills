import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const API = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth & Profile
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const updateProfile = (data) => API.put('/auth/profile', data);
export const getUserProfile = (userId) => API.get(`/auth/users/${userId}`);

// Projects
export const getMyProjects = () => API.get('/projects/mine');
export const getProjects = (params) => API.get('/projects', { params });
export const getProjectById = (id) => API.get(`/projects/${id}`);
export const createProject = (formData) => API.post('/projects', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const updateProject = (id, data) => API.put(`/projects/${id}`, data);
export const deleteProject = (id) => API.delete(`/projects/${id}`);
export const updateProjectGit = (id, data) => API.put(`/projects/${id}/git`, data);
export const getProjectCommits = (id) => API.get(`/projects/${id}/commits`);

// Applications
export const applyToProject = (projectId, data) => API.post(`/applications/${projectId}`, data);
export const getMyApplications = () => API.get('/applications/mine');
export const getDeclinedApplications = () => API.get('/applications/declined');
export const getProjectApplications = (projectId) => API.get(`/applications/project/${projectId}`);
export const updateApplicationStatus = (appId, status) => API.put(`/applications/${appId}/status`, { status });

// Chat
export const getMessages = (projectId) => API.get(`/chat/${projectId}/messages`);
export const uploadChatFile = (projectId, formData) => API.post(`/chat/${projectId}/upload`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

// Notifications
export const getNotifications = () => API.get('/notifications');
export const getNotificationUnreadCount = () => API.get('/notifications/unread-count');
export const markNotificationRead = (id) => API.put(`/notifications/${id}/read`);
export const markBatchNotificationsRead = (ids) => API.put('/notifications/read-batch', { ids });
export const markAllNotificationsRead = () => API.put('/notifications/read-all');
export const deleteNotification = (id) => API.delete(`/notifications/${id}`);

export default API;
