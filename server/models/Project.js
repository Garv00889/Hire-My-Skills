const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  skillRequirements: [{ type: String }],
  deadline: {
    start: { type: Date },
    end: { type: Date },
  },
  designFile: { type: String, default: '' },       // Cloudinary URL
  membersRequired: { type: Number, default: 3, min: 1, max: 6 },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  category: {
    type: String,
    enum: ['college project', 'business', 'corporate', 'UI/UX', 'webdev', 'AI', 'other'],
    default: 'other',
  },
  budget: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  githubRepo: { type: String, default: '' },
  githubRepository: {
    id: { type: Number },
    name: { type: String, default: '' },
    fullName: { type: String, default: '' }, // e.g. "octocat/hello-world"
    owner: { type: String, default: '' },
    htmlUrl: { type: String, default: '' },
    cloneUrl: { type: String, default: '' },
    defaultBranch: { type: String, default: 'main' },
    isPrivate: { type: Boolean, default: false },
    description: { type: String, default: '' },
    connectedAt: { type: Date },
    connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    webhookId: { type: Number },
    webhookSecret: { type: String, select: false },
  },
  githubCollaborators: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    githubUsername: { type: String, default: '' },
    permission: { type: String, enum: ['pull', 'push', 'admin', 'triage', 'maintain'], default: 'push' },
    status: { type: String, enum: ['pending', 'active', 'failed', 'revoked'], default: 'pending' },
    invitedAt: { type: Date, default: Date.now },
    invitationId: { type: Number },
  }],
  status: { type: String, enum: ['open', 'in_progress', 'completed', 'closed', 'flagged'], default: 'open' },
  isFeatured: { type: Boolean, default: false },
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

// Performance indexes for multi-user explore, creator lookups, and member memberships
projectSchema.index({ creator: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ category: 1, status: 1, createdAt: -1 });
projectSchema.index({ level: 1, status: 1 });

module.exports = mongoose.model('Project', projectSchema);
