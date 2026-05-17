const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const expenseLineSchema = new Schema({
    date: { type: Date, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Types.Decimal128, required: true },
    receipt_url: String,
    is_billable: { type: Boolean, default: false },
});

const expenseClaimSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true, index: true },
    employee_id: { type: Types.ObjectId, ref: 'Employee', required: true },
    claim_number: { type: String, required: true },
    claim_date: { type: Date, default: Date.now },
    lines: [expenseLineSchema],
    total_amount: { type: Types.Decimal128, default: 0 },
    currency: { type: String, default: 'USD' },
    status: { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid'], default: 'Draft' },
    notes: String,
    approved_by: { type: Types.ObjectId, ref: 'User' },
    approved_at: Date,
    rejection_reason: String,
    paid_at: Date,
    created_by: { type: Types.ObjectId, ref: 'User' },
    attachments: [{
        filename: String,
        originalname: String,
        path: String,
        size: Number,
        mimetype: String,
        uploaded_at: { type: Date, default: Date.now },
    }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

expenseClaimSchema.index({ company_id: 1, employee_id: 1 });

module.exports = mongoose.model('ExpenseClaim', expenseClaimSchema);
