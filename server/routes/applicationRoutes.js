const express = require('express');
const router = express.Router();
const {
  applyToProject, getProjectApplications, getMyApplications,
  getDeclinedApplications, updateApplicationStatus
} = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/:projectId', protect, applyToProject);
router.get('/mine', protect, getMyApplications);
router.get('/declined', protect, getDeclinedApplications);
router.get('/project/:projectId', protect, getProjectApplications);
router.put('/:id/status', protect, updateApplicationStatus);

module.exports = router;
