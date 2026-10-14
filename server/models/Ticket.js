const mongoose = require('mongoose');

const ticketResponseSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  attachments: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  relatedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  type: {
    type: String,
    enum: ['complaint', 'dispute', 'bug', 'billing', 'general_inquiry'],
    default: 'general_inquiry',
  },
  subject: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  responses: [ticketResponseSchema],
  resolution: { type: String, default: '' },
  resolvedAt: { type: Date },
  adminNotes: { type: String, default: '' },
}, { timestamps: true });

ticketSchema.index({ reporter: 1, status: 1 });
ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
