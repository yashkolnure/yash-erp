const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const earningSchema = new Schema({ label: String, amount: { type: Schema.Types.Decimal128, default: 0 } }, { _id: false });
const deductionSchema = new Schema({ label: String, amount: { type: Schema.Types.Decimal128, default: 0 } }, { _id: false });

const payslipSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    employee_id: { type: Types.ObjectId, ref: 'Employee', required: true },
    payslip_number: { type: String, required: true, unique: true },
    period_start: { type: Date, required: true },
    period_end: { type: Date, required: true },
    pay_date: Date,
    status: { type: String, enum: ['Draft', 'Approved', 'Paid'], default: 'Draft' },
    // Earnings
    basic_salary: { type: Schema.Types.Decimal128, default: 0 },
    earnings: [earningSchema],
    gross_salary: { type: Schema.Types.Decimal128, default: 0 },
    // Deductions
    deductions: [deductionSchema],
    total_deductions: { type: Schema.Types.Decimal128, default: 0 },
    // Net
    net_salary: { type: Schema.Types.Decimal128, default: 0 },
    currency: { type: String, default: 'USD' },
    // Attendance summary
    working_days: Number,
    present_days: Number,
    absent_days: Number,
    leave_days: Number,
    overtime_hours: { type: Number, default: 0 },
    notes: String,
    approved_by: { type: Types.ObjectId, ref: 'User' },
    approved_at: Date,
    created_by: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

payslipSchema.index({ company_id: 1, employee_id: 1, period_start: -1 });
payslipSchema.index({ company_id: 1, status: 1 });

module.exports = mongoose.model('Payslip', payslipSchema);
