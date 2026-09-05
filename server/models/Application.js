const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'temporarily_declined'],
    default: 'pending',
  },
  declinedAt: { type: Date },
  declinedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date },
}, { timestamps: true });

// Index for auto-cleanup of expired declined applications (TTL index)
applicationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// One application per user per project
applicationSchema.index({ project: 1, applicant: 1 }, { unique: true });

// Performance indexes for applicant dashboard & decline lookups
applicationSchema.index({ applicant: 1, status: 1 });
applicationSchema.index({ project: 1, status: 1 });
applicationSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('Application', applicationSchema);
