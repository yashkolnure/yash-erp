const mongoose = require('mongoose');

const paymentApplicationSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    payment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
    invoice_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    invoice_model: { type: String, enum: ['Invoice', 'PurchaseInvoice'], default: 'Invoice' },
    applied_amount: { type: mongoose.Decimal128, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

paymentApplicationSchema.index({ payment_id: 1 });
paymentApplicationSchema.index({ invoice_id: 1 });

module.exports = mongoose.model('PaymentApplication', paymentApplicationSchema);
