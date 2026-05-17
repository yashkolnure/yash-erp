const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    asset_code: { type: String, required: true },
    asset_name: { type: String, required: true },
    category: { type: String, enum: ['Land', 'Building', 'Machinery', 'Vehicle', 'Furniture', 'Computer', 'Other'], default: 'Other' },
    purchase_date: { type: Date, required: true },
    purchase_cost: { type: mongoose.Schema.Types.Decimal128, required: true },
    salvage_value: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    useful_life_years: { type: Number, required: true },
    depreciation_method: { type: String, enum: ['Straight Line', 'Declining Balance', 'Units of Production'], default: 'Straight Line' },
    accumulated_depreciation: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    net_book_value: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    location: { type: String },
    serial_number: { type: String },
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    status: { type: String, enum: ['Active', 'Disposed', 'Under Maintenance', 'Fully Depreciated'], default: 'Active' },
    disposal_date: { type: Date },
    disposal_proceeds: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    notes: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.index({ company_id: 1, status: 1 });
module.exports = mongoose.model('FixedAsset', schema);
