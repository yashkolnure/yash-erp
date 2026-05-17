const mongoose = require('mongoose');

const stockBalanceSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantity_on_hand: { type: Number, default: 0 },
    quantity_reserved: { type: Number, default: 0 },
    quantity_in_transit: { type: Number, default: 0 },
    unit_cost: { type: mongoose.Decimal128, default: 0 },
    valuation_method: {
        type: String,
        enum: ['FIFO', 'LIFO', 'Average'],
        default: 'Average',
    },
    last_count_date: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

stockBalanceSchema.index({ product_id: 1, warehouse_id: 1 }, { unique: true });

module.exports = mongoose.model('StockBalance', stockBalanceSchema);
