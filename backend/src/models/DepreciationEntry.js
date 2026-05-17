const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    asset_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FixedAsset', required: true },
    period_start: Date,
    period_end: Date,
    depreciation_amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    accumulated_before: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    net_book_value_after: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    method: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('DepreciationEntry', schema);
