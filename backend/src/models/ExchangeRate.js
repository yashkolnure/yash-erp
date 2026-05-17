const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const exchangeRateSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    from_currency: { type: String, required: true },
    to_currency: { type: String, required: true },
    rate: { type: Number, required: true },
    effective_date: { type: Date, required: true },
    source: { type: String, default: 'Manual' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

exchangeRateSchema.index({ company_id: 1, from_currency: 1, to_currency: 1, effective_date: -1 });

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);
