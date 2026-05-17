const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    payment_type: {
        type: String,
        enum: ['Customer Payment', 'Vendor Payment'],
        required: true,
    },
    party_id: { type: mongoose.Schema.Types.ObjectId, refPath: 'party_model' },
    party_model: { type: String, enum: ['Customer', 'Vendor'] },
    payment_date: { type: Date, required: true },
    payment_method: {
        type: String,
        enum: ['Cash', 'Check', 'Bank Transfer', 'Credit Card'],
        required: true,
    },
    amount: { type: mongoose.Decimal128, required: true },
    currency: { type: String, default: 'USD' },
    reference_number: String,
    bank_account: String,
    notes: String,
    is_applied: { type: Boolean, default: false },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

paymentSchema.index({ company_id: 1, payment_date: -1 });
paymentSchema.index({ company_id: 1, payment_type: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
