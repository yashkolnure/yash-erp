const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    warehouse_code: { type: String, required: true },
    warehouse_name: { type: String, required: true },
    warehouse_type: String,
    country: String,
    state: String,
    city: String,
    address: String,
    is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

warehouseSchema.index({ company_id: 1, warehouse_code: 1 }, { unique: true });

module.exports = mongoose.model('Warehouse', warehouseSchema);
