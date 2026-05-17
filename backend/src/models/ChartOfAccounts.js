const mongoose = require('mongoose');

const chartOfAccountsSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    account_number: { type: String, required: true },
    account_name: { type: String, required: true },
    account_type: {
        type: String,
        enum: ['Asset', 'Liability', 'Equity', 'Income', 'Expense'],
        required: true,
    },
    account_category: String,
    is_header: { type: Boolean, default: false },
    parent_account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccounts' },
    normal_balance: { type: String, enum: ['Debit', 'Credit'] },
    allow_posting: { type: Boolean, default: true },
    is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

chartOfAccountsSchema.index({ company_id: 1, account_number: 1 }, { unique: true });

module.exports = mongoose.model('ChartOfAccounts', chartOfAccountsSchema);
