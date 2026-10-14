const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true },
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'clients'],
    default: 'all',
  },
  priority: {
    type: String,
    enum: ['info', 'warning', 'urgent', 'success'],
    default: 'info',
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date },
}, { timestamps: true });

announcementSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
