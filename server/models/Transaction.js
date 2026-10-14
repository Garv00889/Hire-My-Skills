const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'project_payment',
      'ready_made_purchase',
      'escrow_deposit',
      'milestone_release',
      'payout',
      'refund',
      'commission_fee',
      'wallet_deposit',
    ],
    required: true,
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed',
  },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  payee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  readyMadeProject: { type: mongoose.Schema.Types.ObjectId, ref: 'ReadyMadeProject' },
  paymentGateway: {
    type: String,
    enum: ['stripe', 'razorpay', 'upi', 'wallet', 'bank_transfer', 'system'],
    default: 'upi',
  },
  gatewayTransactionId: { type: String, default: '' },
  platformFee: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { timestamps: true });

transactionSchema.index({ payer: 1, createdAt: -1 });
transactionSchema.index({ payee: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
