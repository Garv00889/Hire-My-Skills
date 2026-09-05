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
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
}, { timestamps: true });

// Performance indexes for multi-user explore, creator lookups, and member memberships
projectSchema.index({ creator: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ category: 1, status: 1, createdAt: -1 });
projectSchema.index({ level: 1, status: 1 });

module.exports = mongoose.model('Project', projectSchema);
