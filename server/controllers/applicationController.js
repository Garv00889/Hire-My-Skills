const Application = require('../models/Application');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Apply to a project
// @route   POST /api/applications/:projectId
const applyToProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;

    const project = await Project.findById(projectId).populate('creator');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Can't apply to your own project
    if (project.creator._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot apply to your own project' });
    }

    // Check if already applied
    const existing = await Application.findOne({ project: projectId, applicant: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'You have already applied to this project' });
    }

    const application = await Application.create({
      project: projectId,
      applicant: req.user._id,
      message: message || '',
    });

    // Create notification for project creator
    const applicantUser = await User.findById(req.user._id);
    await Notification.create({
      recipient: project.creator._id,
      sender: req.user._id,
      type: 'application_received',
      message: `${applicantUser.name} applied to your project "${project.title}"`,
      relatedProject: projectId,
      relatedApplication: application._id,
    });

    // Emit socket notification (handled in socket.js via global io)
    if (global.io) {
      global.io.to(project.creator._id.toString()).emit('new-notification', {
        type: 'application_received',
        message: `${applicantUser.name} applied to "${project.title}"`,
        applicant: { name: applicantUser.name, profilePicture: applicantUser.profilePicture },
        projectId,
      });
    }

    res.status(201).json({ message: 'Application submitted!', application });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already applied to this project' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Helper: Server-side cleanup of expired declined applications (older than 7 days)
const cleanExpiredApplications = async () => {
  try {
    const expiredApps = await Application.find({
      status: 'temporarily_declined',
      expiresAt: { $lte: new Date() }
    });

    if (expiredApps.length > 0) {
      const expiredIds = expiredApps.map(a => a._id);
      await Notification.deleteMany({ relatedApplication: { $in: expiredIds } });
      await Application.deleteMany({ _id: { $in: expiredIds } });
    }
  } catch (e) {
    // Ignore cleanup errors
  }
};

// @desc    Get applications for a specific project (creator only)
// @route   GET /api/applications/project/:projectId
const getProjectApplications = async (req, res) => {
  try {
    await cleanExpiredApplications();

    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const applications = await Application.find({ project: req.params.projectId })
      .populate('applicant', 'name email contactNumber tagline location bio skills profilePicture githubLink socialLinks portfolioProjects experience certifications education')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get MY applications (candidate view)
// @route   GET /api/applications/mine
const getMyApplications = async (req, res) => {
  try {
    await cleanExpiredApplications();

    const applications = await Application.find({ applicant: req.user._id })
      .populate('project', 'title category level')
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Creator's Temporarily Declined applications (7-day retention)
// @route   GET /api/applications/declined
const getDeclinedApplications = async (req, res) => {
  try {
    await cleanExpiredApplications();

    // Find all projects created by this user
    const myProjects = await Project.find({ creator: req.user._id }).select('_id');
    const projectIds = myProjects.map(p => p._id);

    const declinedApps = await Application.find({
      project: { $in: projectIds },
      status: 'temporarily_declined',
      expiresAt: { $gt: new Date() }
    })
      .populate('project', 'title category level')
      .populate('applicant', 'name email tagline location profilePicture skills')
      .sort({ declinedAt: -1 });

    res.json(declinedApps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve, Reject or Decline application (Creator only)
// @route   PUT /api/applications/:id/status
const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'approved', 'rejected', or 'temporarily_declined'
    const application = await Application.findById(req.params.id)
      .populate('project')
      .populate('applicant', 'name email');

    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (status === 'approved') {
      const projectDoc = await Project.findById(application.project._id);
      const maxMembers = projectDoc.membersRequired || 3;
      const nonCreatorMembers = (projectDoc.members || []).filter(
        (m) => m.toString() !== projectDoc.creator.toString()
      );
      const alreadyMember = (projectDoc.members || []).some(
        (m) => m.toString() === application.applicant._id.toString()
      );

      if (!alreadyMember && nonCreatorMembers.length >= maxMembers) {
        return res.status(400).json({
          message: `This project has reached its required member limit (${maxMembers} contributor seats filled).`,
        });
      }

      application.status = 'approved';
      application.declinedAt = undefined;
      application.expiresAt = undefined;

      // Add member to project team
      await Project.findByIdAndUpdate(application.project._id, {
        $addToSet: { members: application.applicant._id },
      });
    } else if (status === 'rejected' || status === 'temporarily_declined') {
      application.status = 'temporarily_declined';
      application.declinedAt = new Date();
      application.declinedBy = req.user._id;
      // Retention for exactly 7 days
      application.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Remove member if previously approved
      await Project.findByIdAndUpdate(application.project._id, {
        $pull: { members: application.applicant._id },
      });

      // Mark creator's received notification as read/processed so it disappears from active notification list
      await Notification.updateMany({
        relatedApplication: application._id,
        recipient: req.user._id
      }, { isRead: true });
    }

    await application.save();

    // Send candidate notification — remove previous status notifications for this application
    // to prevent duplicates when creator toggles approve/decline multiple times
    await Notification.deleteMany({
      recipient: application.applicant._id,
      relatedApplication: application._id,
      type: { $in: ['application_approved', 'application_rejected'] },
    });

    const notifMsg = status === 'approved'
      ? `Your application for "${application.project.title}" was selected! You can now access the team group chat.`
      : `Application Update: The creator decided not to move forward with your application for "${application.project.title}" at this time.`;

    await Notification.create({
      recipient: application.applicant._id,
      sender: req.user._id,
      type: status === 'approved' ? 'application_approved' : 'application_rejected',
      message: notifMsg,
      relatedProject: application.project._id,
      relatedApplication: application._id,
      isRead: false,
    });

    // Socket notification
    if (global.io) {
      global.io.to(application.applicant._id.toString()).emit('application-update', {
        status: application.status,
        projectTitle: application.project.title,
        projectId: application.project._id,
      });

      global.io.to(req.user._id.toString()).emit('declined-update', {
        applicationId: application._id,
        status: application.status
      });
    }

    res.json({
      message: status === 'approved' ? 'Application shortlisted!' : 'Application declined and moved to Temporarily Declined (7-day retention).',
      application
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  applyToProject, getProjectApplications, getMyApplications,
  getDeclinedApplications, updateApplicationStatus
};
