const express = require('express');
const router = express.Router();
const {
  createProject, getProjects, getProjectById, updateProject,
  deleteProject, getMyProjects, updateGitRepo, getGitCommits
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

router.get('/mine', protect, getMyProjects);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.get('/:id/commits', protect, getGitCommits);
router.put('/:id/git', protect, updateGitRepo);
router.post('/', protect, upload.single('designFile'), createProject);
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);

module.exports = router;
