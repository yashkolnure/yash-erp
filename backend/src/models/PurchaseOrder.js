const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    description: String,
    quantity_ordered: { type: Number, required: true },
    quantity_received: { type: Number, default: 0 },
    unit_price: { type: mongoose.Decimal128, required: true },
    tax_rate: { type: mongoose.Decimal128, default: 0 },
    line_total: { type: mongoose.Decimal128 },
    expected_date: Date,
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    po_number: { type: String, required: true, unique: true },
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    po_date: { type: Date, required: true },
    required_date: Date,
    status: {
        type: String,
        enum: ['Draft', 'Confirmed', 'Received Partial', 'Received Complete', 'Invoiced', 'Closed', 'Cancelled'],
        default: 'Draft',
    },
    line_items: [lineItemSchema],
    subtotal: { type: mongoose.Decimal128, default: 0 },
    tax_amount: { type: mongoose.Decimal128, default: 0 },
    shipping_cost: { type: mongoose.Decimal128, default: 0 },
    total_amount: { type: mongoose.Decimal128, default: 0 },
    currency: { type: String, default: 'USD' },
    notes: String,
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['Low', 'Normal', 'High', 'Urgent'], default: 'Normal' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

purchaseOrderSchema.index({ company_id: 1, po_date: -1 });
purchaseOrderSchema.index({ company_id: 1, status: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
