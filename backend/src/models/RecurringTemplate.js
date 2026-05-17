const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
    description: String,
    quantity: { type: Number, default: 1 },
    unit_price: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    tax_rate: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
}, { _id: false });

const recurringTemplateSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['Invoice', 'Bill', 'Journal'], required: true },
    frequency: { type: String, enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'], required: true },
    next_run_date: { type: Date, required: true },
    end_date: { type: Date },
    customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    line_items: [lineItemSchema],
    notes: String,
    is_active: { type: Boolean, default: true },
    last_run_date: { type: Date },
    run_count: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('RecurringTemplate', recurringTemplateSchema);
