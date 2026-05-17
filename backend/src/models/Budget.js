const mongoose = require('mongoose');
const lineSchema = new mongoose.Schema({
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccounts' },
    account_name: String,
    jan: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    feb: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    mar: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    apr: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    may: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    jun: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    jul: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    aug: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    sep: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    oct: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    nov: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    dec: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    total: { type: mongoose.Schema.Types.Decimal128, default: 0 },
});
const schema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    fiscal_year: { type: Number, required: true },
    status: { type: String, enum: ['Draft', 'Active', 'Closed'], default: 'Draft' },
    lines: [lineSchema],
    notes: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.index({ company_id: 1, fiscal_year: 1 });
module.exports = mongoose.model('Budget', schema);
