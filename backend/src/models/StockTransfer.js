const mongoose = require('mongoose');

const stockTransferSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    transfer_number: { type: String, unique: true },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    from_warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    to_warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantity: { type: Number, required: true },
    transfer_date: { type: Date, default: Date.now },
    notes: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

stockTransferSchema.pre('save', async function (next) {
    if (!this.transfer_number) {
        const count = await mongoose.model('StockTransfer').countDocuments({ company_id: this.company_id });
        const year = new Date().getFullYear();
        this.transfer_number = `TRF-${year}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
