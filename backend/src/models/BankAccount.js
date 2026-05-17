const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    account_name: { type: String, required: true },
    bank_name: { type: String, required: true },
    account_number: { type: String, required: true },
    account_type: { type: String, enum: ['Current', 'Savings', 'Payroll', 'Escrow', 'Other'], default: 'Current' },
    currency: { type: String, default: 'USD' },
    // India
    ifsc_code: String,
    // International
    swift_code: String,
    routing_number: String,
    iban: String,
    branch_name: String,
    branch_address: String,
    is_default: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    notes: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

bankAccountSchema.index({ company_id: 1 });

module.exports = mongoose.model('BankAccount', bankAccountSchema);
