import API from '../../services/api';

// Admin Auth & Check
export const checkAdminStatus = () => API.get('/admin/check');
export const seedAdminData = () => API.post('/admin/seed-admin');

// Dashboard Analytics
export const getDashboardAnalytics = () => API.get('/admin/dashboard');

// Users Management
export const getAdminUsers = (params) => API.get('/admin/users', { params });
export const getAdminUserById = (id) => API.get(`/admin/users/${id}`);
export const updateAdminUserStatus = (id, data) => API.put(`/admin/users/${id}/status`, data);
export const updateAdminUserRole = (id, data) => API.put(`/admin/users/${id}/role`, data);
export const updateAdminUserNotes = (id, data) => API.put(`/admin/users/${id}/notes`, data);
export const deleteAdminUser = (id) => API.delete(`/admin/users/${id}`);

// Projects
export const getAdminProjects = (params) => API.get('/admin/projects', { params });
export const getAdminProjectById = (id) => API.get(`/admin/projects/${id}`);
export const updateAdminProjectStatus = (id, data) => API.put(`/admin/projects/${id}/status`, data);
export const deleteAdminProject = (id) => API.delete(`/admin/projects/${id}`);

// Proposals & Bids
export const getAdminProposals = (params) => API.get('/admin/proposals', { params });
export const updateAdminProposalStatus = (id, data) => API.put(`/admin/proposals/${id}/status`, data);

// Ready-Made Projects
export const getAdminReadyMadeProjects = (params) => API.get('/admin/ready-made-projects', { params });
export const createAdminReadyMadeProject = (data) => API.post('/admin/ready-made-projects', data);
export const updateAdminReadyMadeProjectStatus = (id, data) => API.put(`/admin/ready-made-projects/${id}/status`, data);
export const deleteAdminReadyMadeProject = (id) => API.delete(`/admin/ready-made-projects/${id}`);

// Transactions & Finance
export const getAdminTransactions = (params) => API.get('/admin/transactions', { params });
export const createAdminTransaction = (data) => API.post('/admin/transactions', data);
export const getAdminCommissions = () => API.get('/admin/commissions');

// Payouts
export const getAdminPayouts = (params) => API.get('/admin/payouts', { params });
export const updateAdminPayoutStatus = (id, data) => API.put(`/admin/payouts/${id}/status`, data);

// Refunds
export const processAdminRefund = (data) => API.post('/admin/refunds/process', data);

// Reviews & Ratings
export const getAdminReviews = (params) => API.get('/admin/reviews', { params });
export const updateAdminReviewStatus = (id, data) => API.put(`/admin/reviews/${id}/status`, data);
export const deleteAdminReview = (id) => API.delete(`/admin/reviews/${id}`);

// Complaints & Support Tickets
export const getAdminTickets = (params) => API.get('/admin/tickets', { params });
export const getAdminTicketById = (id) => API.get(`/admin/tickets/${id}`);
export const replyAdminTicket = (id, data) => API.post(`/admin/tickets/${id}/reply`, data);
export const updateAdminTicketStatus = (id, data) => API.put(`/admin/tickets/${id}/status`, data);

// Announcements
export const getAdminAnnouncements = () => API.get('/admin/announcements');
export const createAdminAnnouncement = (data) => API.post('/admin/announcements', data);
export const updateAdminAnnouncement = (id, data) => API.put(`/admin/announcements/${id}`, data);
export const deleteAdminAnnouncement = (id) => API.delete(`/admin/announcements/${id}`);

// Audit Logs
export const getAdminAuditLogs = (params) => API.get('/admin/audit-logs', { params });

// Platform Settings
export const getAdminSettings = () => API.get('/admin/settings');
export const updateAdminSettings = (data) => API.put('/admin/settings', data);

// Roles & Staff
export const getAdminRoles = () => API.get('/admin/roles');
