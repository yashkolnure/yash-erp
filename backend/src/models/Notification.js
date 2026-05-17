const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String },
    type: { type: String, enum: ['info', 'warning', 'success', 'error'], default: 'info' },
    entity_type: { type: String }, // 'Invoice', 'LeaveRequest', etc.
    entity_id: { type: mongoose.Schema.Types.ObjectId },
    link: { type: String }, // frontend route e.g. '/invoices'
    read: { type: Boolean, default: false },
    read_at: { type: Date },
}, { timestamps: true });
schema.index({ user_id: 1, read: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', schema);
