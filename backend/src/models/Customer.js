const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    customer_code: { type: String, required: true },
    customer_name: { type: String, required: true },
    email: String,
    phone: String,
    country: String,
    state: String,
    city: String,
    address: String,
    tax_id: String,
    credit_limit: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    credit_used: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    credit_hold: { type: Boolean, default: false },
    payment_terms_days: { type: Number, default: 30 },
    customer_status: {
        type: String,
        enum: ['Active', 'Inactive', 'Blocked'],
        default: 'Active',
    },
    is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

customerSchema.index({ company_id: 1, customer_code: 1 }, { unique: true });
customerSchema.index({ customer_name: 'text', email: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
