const express = require('express');
const router = express.Router();
const {
  protect,
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
} = require('../middleware/authMiddleware');

const {
  getDashboardAnalytics,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  updateUserNotes,
  deleteUser,
  getProjects,
  getProjectById,
  updateProjectStatus,
  deleteProject,
  getProposals,
  updateProposalStatus,
  getReadyMadeProjects,
  createReadyMadeProject,
  updateReadyMadeProjectStatus,
  deleteReadyMadeProject,
  getTransactions,
  createTransaction,
  getCommissions,
  getPayouts,
  updatePayoutStatus,
  processRefund,
  getReviews,
  updateReviewStatus,
  deleteReview,
  getTickets,
  getTicketById,
  replyTicket,
  updateTicketStatus,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAuditLogs,
  getSettings,
  updateSettings,
  getAdminRoles,
  seedAdminData,
} = require('../controllers/adminController');

// All admin routes require login (protect)
router.use(protect);

// Endpoint for testing or becoming superadmin / seeding sample data
router.post('/seed-admin', seedAdminData);

// Admin status check (returns admin status and permissions)
router.get('/check', (req, res) => {
  const isAdm = ['admin', 'superadmin', 'moderator', 'support'].includes(req.user?.role);
  res.json({
    isAdmin: isAdm,
    role: req.user?.role || 'student',
    permissions: req.user?.adminPermissions || {},
  });
});

// All subsequent routes require admin role
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', getDashboardAnalytics);

// User Management
router.get('/users', requirePermission('canManageUsers'), getUsers);
router.get('/users/:id', requirePermission('canManageUsers'), getUserById);
router.put('/users/:id/status', requirePermission('canManageUsers'), updateUserStatus);
router.put('/users/:id/role', requireSuperAdmin, updateUserRole);
router.put('/users/:id/notes', requirePermission('canManageUsers'), updateUserNotes);
router.delete('/users/:id', requireSuperAdmin, deleteUser);

// Projects (Supports both /projects and /project)
router.get('/projects', requirePermission('canManageProjects'), getProjects);
router.get('/project', requirePermission('canManageProjects'), getProjects);
router.get('/projects/:id', requirePermission('canManageProjects'), getProjectById);
router.get('/project/:id', requirePermission('canManageProjects'), getProjectById);
router.put('/projects/:id/status', requirePermission('canManageProjects'), updateProjectStatus);
router.put('/project/:id/status', requirePermission('canManageProjects'), updateProjectStatus);
router.delete('/projects/:id', requirePermission('canManageProjects'), deleteProject);
router.delete('/project/:id', requirePermission('canManageProjects'), deleteProject);

// Proposals
router.get('/proposals', requirePermission('canManageProjects'), getProposals);
router.put('/proposals/:id/status', requirePermission('canManageProjects'), updateProposalStatus);

// Ready-Made Projects
router.get('/ready-made-projects', getReadyMadeProjects);
router.post('/ready-made-projects', createReadyMadeProject);
router.put('/ready-made-projects/:id/status', updateReadyMadeProjectStatus);
router.delete('/ready-made-projects/:id', deleteReadyMadeProject);

// Finance & Transactions
router.get('/transactions', requirePermission('canManageFinance'), getTransactions);
router.post('/transactions', requirePermission('canManageFinance'), createTransaction);
router.get('/commissions', requirePermission('canManageFinance'), getCommissions);
router.get('/payouts', requirePermission('canManageFinance'), getPayouts);
router.put('/payouts/:id/status', requirePermission('canManageFinance'), updatePayoutStatus);
router.post('/refunds/process', requirePermission('canManageFinance'), processRefund);

// Reviews
router.get('/reviews', getReviews);
router.put('/reviews/:id/status', updateReviewStatus);
router.delete('/reviews/:id', deleteReview);

// Complaints & Support Tickets
router.get('/tickets', requirePermission('canManageTickets'), getTickets);
router.get('/tickets/:id', requirePermission('canManageTickets'), getTicketById);
router.post('/tickets/:id/reply', requirePermission('canManageTickets'), replyTicket);
router.put('/tickets/:id/status', requirePermission('canManageTickets'), updateTicketStatus);

// Announcements
router.get('/announcements', getAnnouncements);
router.post('/announcements', requirePermission('canManageAnnouncements'), createAnnouncement);
router.put('/announcements/:id', requirePermission('canManageAnnouncements'), updateAnnouncement);
router.delete('/announcements/:id', requirePermission('canManageAnnouncements'), deleteAnnouncement);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

// Platform Settings
router.get('/settings', getSettings);
router.put('/settings', requirePermission('canManageSettings'), updateSettings);

// Admin Roles & Staff
router.get('/roles', requireSuperAdmin, getAdminRoles);

module.exports = router;
