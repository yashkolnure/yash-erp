const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    description: String,
    quantity: { type: Number, required: true, min: 1 },
    unit_price: { type: mongoose.Decimal128, required: true },
    tax_rate: { type: mongoose.Decimal128, default: 0 },
    line_total: { type: mongoose.Decimal128 },
}, { _id: false });

const salesOrderSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    order_number: { type: String, required: true, unique: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    order_date: { type: Date, required: true },
    required_date: Date,
    shipping_date: Date,
    status: {
        type: String,
        enum: ['Draft', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Invoiced', 'Cancelled'],
        default: 'Draft',
    },
    line_items: [lineItemSchema],
    subtotal: { type: mongoose.Decimal128, default: 0 },
    tax_amount: { type: mongoose.Decimal128, default: 0 },
    shipping_cost: { type: mongoose.Decimal128, default: 0 },
    discount_amount: { type: mongoose.Decimal128, default: 0 },
    total_amount: { type: mongoose.Decimal128, default: 0 },
    currency: { type: String, default: 'USD' },
    notes: String,
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['Low', 'Normal', 'High', 'Urgent'], default: 'Normal' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

salesOrderSchema.index({ company_id: 1, order_date: -1 });
salesOrderSchema.index({ company_id: 1, status: 1 });

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
