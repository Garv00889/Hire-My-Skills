const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['application_received', 'application_approved', 'application_rejected', 'new_message'],
    required: true,
  },
  message: { type: String, required: true },
  relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  relatedApplication: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

// Performance indexes for instant notification counts and auto-cleanup
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ relatedApplication: 1 });
notificationSchema.index({ relatedProject: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
