const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    description: { type: String },
    reference: { type: String },
    debit: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    credit: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    balance: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    matched: { type: Boolean, default: false },
    matched_payment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    matched_at: Date,
});

const schema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    bank_account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true },
    statement_date: { type: Date, required: true },
    opening_balance: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    closing_balance: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    currency: { type: String, default: 'USD' },
    lines: [lineSchema],
    status: { type: String, enum: ['Draft', 'Reconciled', 'Partial'], default: 'Draft' },
    reconciled_at: Date,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ company_id: 1, bank_account_id: 1 });

module.exports = mongoose.model('BankStatement', schema);
