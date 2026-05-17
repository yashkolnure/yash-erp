const mongoose = require('mongoose');

const glBalanceSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccounts', required: true },
    fiscal_year: { type: Number, required: true },
    fiscal_period: { type: Number, required: true },
    debit_balance: { type: mongoose.Decimal128, default: 0 },
    credit_balance: { type: mongoose.Decimal128, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

glBalanceSchema.index({ account_id: 1, fiscal_year: 1, fiscal_period: 1 }, { unique: true });

module.exports = mongoose.model('GLBalance', glBalanceSchema);
