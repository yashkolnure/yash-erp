const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const approvalStepSchema = new Schema({
    approver_id: { type: Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    comments: String,
    acted_at: Date,
    order: { type: Number, default: 1 },
}, { _id: false });

const approvalRequestSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    entity_type: { type: String, required: true }, // 'PurchaseOrder', 'Invoice', 'Payslip', 'LeaveRequest'
    entity_id: { type: Types.ObjectId, required: true },
    entity_ref: String, // human-readable reference
    requested_by: { type: Types.ObjectId, ref: 'User', required: true },
    amount: { type: Schema.Types.Decimal128 }, // for value-based routing
    currency: String,
    description: String,
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], default: 'Pending' },
    steps: [approvalStepSchema],
    current_step: { type: Number, default: 0 },
    completed_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

approvalRequestSchema.index({ company_id: 1, status: 1 });
approvalRequestSchema.index({ entity_type: 1, entity_id: 1 });
approvalRequestSchema.index({ 'steps.approver_id': 1, status: 1 });

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
