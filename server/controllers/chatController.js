const Message = require('../models/Message');
const Project = require('../models/Project');

// @desc    Get all messages for a project
// @route   GET /api/chat/:projectId/messages
const getMessages = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify user is a member of the project
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isAuthorized = project.creator.toString() === req.user._id.toString() ||
      project.members.some(m => m.toString() === req.user._id.toString());
    if (!isAuthorized) {
      return res.status(403).json({ message: 'You are not an authorized member of this project' });
    }

    const messages = await Message.find({ project: projectId })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload a file to group chat
// @route   POST /api/chat/:projectId/upload
const uploadFile = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isAuthorized = project.creator.toString() === req.user._id.toString() ||
      project.members.some(m => m.toString() === req.user._id.toString());
    if (!isAuthorized) return res.status(403).json({ message: 'Not authorized' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const message = await Message.create({
      project: projectId,
      sender: req.user._id,
      fileUrl: req.file.path,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      isFile: true,
      content: req.file.originalname,
    });

    await message.populate('sender', 'name profilePicture');

    // Emit to all project members via socket
    if (global.io) {
      global.io.to(projectId).emit('receive-message', message);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMessages, uploadFile };
