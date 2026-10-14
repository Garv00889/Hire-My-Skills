const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  readyMadeProject: { type: mongoose.Schema.Types.ObjectId, ref: 'ReadyMadeProject' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  status: {
    type: String,
    enum: ['published', 'hidden', 'flagged'],
    default: 'published',
  },
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

reviewSchema.index({ reviewer: 1 });
reviewSchema.index({ reviewee: 1 });
reviewSchema.index({ project: 1 });
reviewSchema.index({ readyMadeProject: 1 });
reviewSchema.index({ status: 1 });

module.exports = mongoose.model('Review', reviewSchema);
