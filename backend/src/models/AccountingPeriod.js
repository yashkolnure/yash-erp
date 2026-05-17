const mongoose = require('mongoose');

const accountingPeriodSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    closed_at: { type: Date },
    closed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

accountingPeriodSchema.index({ company_id: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('AccountingPeriod', accountingPeriodSchema);
