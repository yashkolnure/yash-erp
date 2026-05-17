const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    read_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    // Link message to a business entity (invoice, order, etc.)
    entity_type: { type: String, enum: ['Invoice', 'SalesOrder', 'PurchaseOrder', 'Payment', 'Customer', 'Vendor', 'General'], default: 'General' },
    entity_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    entity_ref: String,
    is_archived: { type: Boolean, default: false },
    priority: { type: String, enum: ['Normal', 'High', 'Urgent'], default: 'Normal' },
    attachments: [{ name: String, url: String }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

messageSchema.index({ company_id: 1, created_at: -1 });
messageSchema.index({ recipients: 1 });

module.exports = mongoose.model('Message', messageSchema);
