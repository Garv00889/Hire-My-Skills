const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  payoutId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'INR' },
  paymentMethod: {
    type: String,
    enum: ['upi', 'bank_transfer', 'paypal'],
    required: true,
  },
  paymentDetails: {
    upiId: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    bankName: { type: String, default: '' },
    paypalEmail: { type: String, default: '' },
    accountHolderName: { type: String, default: '' },
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'processing', 'completed', 'rejected'],
    default: 'pending',
  },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date },
  rejectionReason: { type: String, default: '' },
  transactionRef: { type: String, default: '' },
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

payoutSchema.index({ user: 1, status: 1 });
payoutSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payout', payoutSchema);
