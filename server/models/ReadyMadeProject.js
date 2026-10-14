const mongoose = require('mongoose');

const readyMadeProjectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['webdev', 'AI', 'mobile', 'blockchain', 'college project', 'UI/UX', 'scripts', 'other'],
    default: 'college project',
  },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  techStack: [{ type: String }],
  demoUrl: { type: String, default: '' },
  githubUrl: { type: String, default: '' },
  downloadUrl: { type: String, default: '' },
  previewImages: [{ type: String }],
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending_review', 'approved', 'rejected', 'suspended'],
    default: 'approved',
  },
  isFeatured: { type: Boolean, default: false },
  salesCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0 },
  reviewCount: { type: Number, default: 0 },
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

readyMadeProjectSchema.index({ seller: 1 });
readyMadeProjectSchema.index({ status: 1, category: 1, createdAt: -1 });
readyMadeProjectSchema.index({ isFeatured: 1 });

module.exports = mongoose.model('ReadyMadeProject', readyMadeProjectSchema);
