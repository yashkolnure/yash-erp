const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const adjustmentLineSchema = new Schema({
    product_id: { type: Types.ObjectId, ref: 'Product', required: true },
    warehouse_id: { type: Types.ObjectId, ref: 'Warehouse', required: true },
    adjustment_type: { type: String, enum: ['Add', 'Remove', 'Set'], required: true },
    quantity: { type: Number, required: true },
    current_quantity: Number,
    new_quantity: Number,
    unit_cost: { type: Schema.Types.Decimal128, default: 0 },
    reason: String,
}, { _id: true });

const stockAdjustmentSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    adjustment_number: { type: String, required: true, unique: true },
    adjustment_date: { type: Date, required: true },
    adjustment_type: { type: String, enum: ['Physical Count', 'Write-Off', 'Write-Up', 'Damage', 'Theft', 'Other'], required: true },
    status: { type: String, enum: ['Draft', 'Posted'], default: 'Draft' },
    lines: [adjustmentLineSchema],
    notes: String,
    reference: String,
    created_by: { type: Types.ObjectId, ref: 'User' },
    posted_by: { type: Types.ObjectId, ref: 'User' },
    posted_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

stockAdjustmentSchema.index({ company_id: 1, adjustment_date: -1 });

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
