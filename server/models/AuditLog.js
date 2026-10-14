const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetModel: {
    type: String,
    enum: ['User', 'Project', 'Application', 'ReadyMadeProject', 'Transaction', 'Payout', 'Review', 'Ticket', 'PlatformSettings', 'Announcement', 'Security'],
    required: true,
  },
  targetId: { type: String, default: '' },
  targetName: { type: String, default: '' },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
