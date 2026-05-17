const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    description: String,
    quantity: { type: Number, required: true },
    unit_price: { type: mongoose.Decimal128, required: true },
    tax_rate: { type: mongoose.Decimal128, default: 0 },
    line_total: { type: mongoose.Decimal128 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    invoice_number: { type: String, required: true, unique: true },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    sales_order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
    invoice_date: { type: Date, required: true },
    due_date: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Draft', 'Posted', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
        default: 'Draft',
    },
    line_items: [lineItemSchema],
    subtotal: { type: mongoose.Decimal128, default: 0 },
    tax_amount: { type: mongoose.Decimal128, default: 0 },
    shipping_cost: { type: mongoose.Decimal128, default: 0 },
    total_amount: { type: mongoose.Decimal128, default: 0 },
    amount_paid: { type: mongoose.Decimal128, default: 0 },
    amount_due: { type: mongoose.Decimal128, default: 0 },
    currency: { type: String, default: 'USD' },
    notes: String,
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['Low', 'Normal', 'High', 'Urgent'], default: 'Normal' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    posted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    posted_at: Date,
    attachments: [{
        filename: String,
        originalname: String,
        path: String,
        size: Number,
        mimetype: String,
        uploaded_at: { type: Date, default: Date.now },
    }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

invoiceSchema.index({ company_id: 1, invoice_date: -1 });
invoiceSchema.index({ company_id: 1, status: 1 });
invoiceSchema.index({ customer_id: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
