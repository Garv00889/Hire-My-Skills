const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  fileType: { type: String, default: '' },  // 'image', 'pdf', 'file'
  isFile: { type: Boolean, default: false },
  isGitActivity: { type: Boolean, default: false },
  gitActivity: {
    type: { type: String, enum: ['push', 'pull_request', 'issues', 'collaborator', 'repo_connected', 'repo_created', 'repo_disconnected'] },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    url: { type: String, default: '' },
    actor: {
      name: { type: String, default: '' },
      avatar: { type: String, default: '' },
      githubUsername: { type: String, default: '' },
    },
    branch: { type: String, default: '' },
    commitCount: { type: Number, default: 0 },
    commits: [{
      sha: { type: String },
      message: { type: String },
      url: { type: String },
    }],
    action: { type: String, default: '' }, // e.g. "opened", "closed", "merged", "invited"
  },
}, { timestamps: true });

// Performance indexes for high concurrency group chat
messageSchema.index({ project: 1, createdAt: 1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model('Message', messageSchema);
