const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    company_code: { type: String, required: true, unique: true, minlength: 3, maxlength: 50 },
    company_name: { type: String, required: true },
    tax_id: String,
    gst_number: String,
    pan_number: String,
    supported_currencies: [{ type: String }],
    country: String,
    state: String,
    city: String,
    postal_code: String,
    address: String,
    email: String,
    phone: String,
    website: String,
    fiscal_year_start: Date,
    fiscal_year_end: Date,
    primary_currency: { type: String, required: true, default: 'USD' },
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Company', companySchema);
