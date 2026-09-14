const express = require('express');
const router = express.Router();
const { getMessages, createMessage, uploadFile } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

router.get('/:projectId/messages', protect, getMessages);
router.post('/:projectId/messages', protect, createMessage);
router.post('/:projectId/upload', protect, upload.single('file'), uploadFile);

module.exports = router;
