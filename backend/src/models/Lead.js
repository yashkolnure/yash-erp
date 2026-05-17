const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const activitySchema = new Schema({
    type: { type: String, enum: ['Call', 'Email', 'Meeting', 'Note', 'Task'] },
    description: String,
    date: Date,
    outcome: String,
    user_id: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true, _id: true });

const leadSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    lead_number: { type: String, required: true },
    // Contact info
    contact_name: { type: String, required: true },
    company_name: String,
    email: String,
    phone: String,
    website: String,
    // Classification
    stage: { type: String, enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'], default: 'New' },
    source: { type: String, enum: ['Website', 'Referral', 'Cold Call', 'Advertisement', 'Trade Show', 'Social Media', 'Other'], default: 'Other' },
    type: { type: String, enum: ['Lead', 'Opportunity'], default: 'Lead' },
    priority: { type: String, enum: ['Low', 'Normal', 'High', 'Urgent'], default: 'Normal' },
    // Value
    estimated_value: { type: Schema.Types.Decimal128, default: 0 },
    probability: { type: Number, default: 20, min: 0, max: 100 },
    currency: { type: String, default: 'USD' },
    expected_close_date: Date,
    // Assignment
    assigned_to: { type: Types.ObjectId, ref: 'User' },
    // Conversion
    converted: { type: Boolean, default: false },
    converted_customer_id: { type: Types.ObjectId, ref: 'Customer' },
    converted_quotation_id: { type: Types.ObjectId, ref: 'Quotation' },
    converted_at: Date,
    // Details
    description: String,
    lost_reason: String,
    activities: [activitySchema],
    tags: [String],
    created_by: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

leadSchema.index({ company_id: 1, stage: 1 });
leadSchema.index({ company_id: 1, assigned_to: 1 });

module.exports = mongoose.model('Lead', leadSchema);
