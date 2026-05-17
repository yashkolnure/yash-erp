const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    product_code: { type: String, required: true },
    product_name: { type: String, required: true },
    description: String,
    category: String,
    product_type: {
        type: String,
        enum: ['Raw Material', 'Finished Goods', 'Service', 'Bundle'],
        default: 'Finished Goods',
    },
    base_unit_of_measure: { type: String, default: 'EA' },
    standard_cost: { type: mongoose.Decimal128, default: 0 },
    list_price: { type: mongoose.Decimal128, default: 0 },
    reorder_level: { type: Number, default: 0 },
    reorder_quantity: { type: Number, default: 0 },
    is_taxable: { type: Boolean, default: true },
    is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

productSchema.index({ company_id: 1, product_code: 1 }, { unique: true });
productSchema.index({ product_name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
