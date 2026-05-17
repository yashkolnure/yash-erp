const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const timesheetEntrySchema = new Schema({
    date: { type: Date, required: true },
    hours: { type: Number, required: true, min: 0, max: 24 },
    description: String,
    project: String,
    billable: { type: Boolean, default: false },
}, { _id: true });

const timesheetSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    employee_id: { type: Types.ObjectId, ref: 'Employee', required: true },
    week_start: { type: Date, required: true },
    week_end: { type: Date, required: true },
    entries: [timesheetEntrySchema],
    total_hours: { type: Number, default: 0 },
    billable_hours: { type: Number, default: 0 },
    status: { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Rejected'], default: 'Draft' },
    approved_by: { type: Types.ObjectId, ref: 'User' },
    approved_at: Date,
    notes: String,
    created_by: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

timesheetSchema.index({ company_id: 1, employee_id: 1, week_start: -1 });

module.exports = mongoose.model('Timesheet', timesheetSchema);
