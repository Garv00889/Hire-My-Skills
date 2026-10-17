const express = require('express');
const router = express.Router();
const {
  getMyGitHubStatus,
  disconnectGitHub,
  getProjectGitHubStatus,
  listUserRepositories,
  createAndConnectRepo,
  connectExistingRepo,
  disconnectProjectRepo,
  grantCollaboratorAccess,
  revokeCollaboratorAccess,
  getProjectCommits,
  handleGitHubWebhook,
} = require('../controllers/githubController');
const { protect } = require('../middleware/authMiddleware');

// User status & repos
router.get('/status', protect, getMyGitHubStatus);
router.post('/disconnect', protect, disconnectGitHub);
router.get('/user-repos', protect, listUserRepositories);

// Project GitHub integration
router.get('/projects/:projectId', protect, getProjectGitHubStatus);
router.post('/projects/:projectId/create-repo', protect, createAndConnectRepo);
router.post('/projects/:projectId/connect-existing', protect, connectExistingRepo);
router.delete('/projects/:projectId/disconnect-repo', protect, disconnectProjectRepo);

// Collaborator access
router.post('/projects/:projectId/collaborators', protect, grantCollaboratorAccess);
router.delete('/projects/:projectId/collaborators/:memberId', protect, revokeCollaboratorAccess);

// Commits
router.get('/projects/:projectId/commits', protect, getProjectCommits);

// Public Webhook receiver for GitHub push & PR events
router.post('/webhook/:projectId', handleGitHubWebhook);

module.exports = router;
