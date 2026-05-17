const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity_received: { type: Number, required: true },
    quantity_accepted: { type: Number, default: 0 },
    quantity_rejected: { type: Number, default: 0 },
    batch_number: String,
    expiration_date: Date,
}, { _id: false });

const goodsReceiptNoteSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    grn_number: { type: String, required: true, unique: true },
    purchase_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    receipt_date: { type: Date, required: true },
    warehouse_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    status: {
        type: String,
        enum: ['Draft', 'Received', 'Accepted', 'Rejected'],
        default: 'Draft',
    },
    line_items: [lineItemSchema],
    notes: String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attachments: [{
        filename: String,
        originalname: String,
        path: String,
        size: Number,
        mimetype: String,
        uploaded_at: { type: Date, default: Date.now },
    }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

goodsReceiptNoteSchema.index({ company_id: 1, receipt_date: -1 });

module.exports = mongoose.model('GoodsReceiptNote', goodsReceiptNoteSchema);
