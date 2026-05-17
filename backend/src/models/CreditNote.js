const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const lineItemSchema = new Schema({
    description: String,
    quantity: { type: Number, required: true },
    unit_price: { type: Schema.Types.Decimal128, required: true },
    tax_rate: { type: Schema.Types.Decimal128, default: 0 },
    line_total: { type: Schema.Types.Decimal128 },
}, { _id: false });

const creditNoteSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    credit_note_number: { type: String, required: true, unique: true },
    invoice_id: { type: Types.ObjectId, ref: 'Invoice' },
    customer_id: { type: Types.ObjectId, ref: 'Customer', required: true },
    credit_note_date: { type: Date, required: true },
    status: { type: String, enum: ['Draft', 'Posted', 'Applied', 'Void'], default: 'Draft' },
    reason: { type: String, required: true },
    line_items: [lineItemSchema],
    subtotal: { type: Schema.Types.Decimal128, default: 0 },
    tax_amount: { type: Schema.Types.Decimal128, default: 0 },
    total_amount: { type: Schema.Types.Decimal128, default: 0 },
    amount_applied: { type: Schema.Types.Decimal128, default: 0 },
    amount_remaining: { type: Schema.Types.Decimal128, default: 0 },
    currency: { type: String, default: 'USD' },
    notes: String,
    created_by: { type: Types.ObjectId, ref: 'User' },
    posted_by: { type: Types.ObjectId, ref: 'User' },
    posted_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

creditNoteSchema.index({ company_id: 1, credit_note_date: -1 });
creditNoteSchema.index({ customer_id: 1 });

module.exports = mongoose.model('CreditNote', creditNoteSchema);
