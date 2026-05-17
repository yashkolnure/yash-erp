const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const lineItemSchema = new Schema({
    product_id: { type: Types.ObjectId, ref: 'Product' },
    description: String,
    quantity: { type: Number, required: true },
    unit_price: { type: Schema.Types.Decimal128, required: true },
    tax_rate: { type: Schema.Types.Decimal128, default: 0 },
    discount_pct: { type: Schema.Types.Decimal128, default: 0 },
    line_total: { type: Schema.Types.Decimal128 },
}, { _id: false });

const quotationSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    quotation_number: { type: String, required: true, unique: true },
    customer_id: { type: Types.ObjectId, ref: 'Customer', required: true },
    quotation_date: { type: Date, required: true },
    expiry_date: Date,
    status: { type: String, enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'], default: 'Draft' },
    line_items: [lineItemSchema],
    subtotal: { type: Schema.Types.Decimal128, default: 0 },
    discount_amount: { type: Schema.Types.Decimal128, default: 0 },
    tax_amount: { type: Schema.Types.Decimal128, default: 0 },
    total_amount: { type: Schema.Types.Decimal128, default: 0 },
    currency: { type: String, default: 'USD' },
    notes: String,
    terms_conditions: String,
    assigned_to: { type: Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['Low', 'Normal', 'High', 'Urgent'], default: 'Normal' },
    converted_to_order_id: { type: Types.ObjectId, ref: 'SalesOrder' },
    lead_id: { type: Types.ObjectId, ref: 'Lead' },
    created_by: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

quotationSchema.index({ company_id: 1, quotation_date: -1 });
quotationSchema.index({ company_id: 1, status: 1 });
quotationSchema.index({ customer_id: 1 });

module.exports = mongoose.model('Quotation', quotationSchema);
