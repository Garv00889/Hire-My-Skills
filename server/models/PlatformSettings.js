const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'HireMySkills' },
  supportEmail: { type: String, default: 'support@hiremyskills.com' },
  contactPhone: { type: String, default: '+91 98765 43210' },
  commissionRate: { type: Number, default: 10, min: 0, max: 100 }, // in percentage
  minPayoutAmount: { type: Number, default: 500, min: 100 }, // in INR
  withdrawalFee: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  maintenanceMode: { type: Boolean, default: false },
  allowNewRegistrations: { type: Boolean, default: true },
  allowProjectPosting: { type: Boolean, default: true },
  maxProjectsPerUser: { type: Number, default: 20 },
  escrowEnabled: { type: Boolean, default: true },
  bannerAnnouncement: {
    active: { type: Boolean, default: false },
    message: { type: String, default: '' },
    type: { type: String, enum: ['info', 'warning', 'success', 'danger'], default: 'info' },
  },
}, { timestamps: true });

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
