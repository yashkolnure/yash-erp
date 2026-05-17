const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const leaveRequestSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    employee_id: { type: Types.ObjectId, ref: 'Employee', required: true },
    leave_type: { type: String, enum: ['Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Unpaid', 'Other'], required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    days: { type: Number, required: true },
    half_day: { type: Boolean, default: false },
    reason: String,
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'], default: 'Pending' },
    approved_by: { type: Types.ObjectId, ref: 'User' },
    approved_at: Date,
    rejection_reason: String,
    created_by: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

leaveRequestSchema.index({ company_id: 1, employee_id: 1 });
leaveRequestSchema.index({ company_id: 1, status: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
