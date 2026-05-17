const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    vendor_code: { type: String, required: true },
    vendor_name: { type: String, required: true },
    email: String,
    phone: String,
    country: String,
    state: String,
    city: String,
    address: String,
    tax_id: String,
    payment_terms_days: { type: Number, default: 30 },
    currency: { type: String, default: 'USD' },
    vendor_status: {
        type: String,
        enum: ['Active', 'Inactive', 'Blocked'],
        default: 'Active',
    },
    is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

vendorSchema.index({ company_id: 1, vendor_code: 1 }, { unique: true });
vendorSchema.index({ vendor_name: 'text' });

module.exports = mongoose.model('Vendor', vendorSchema);
