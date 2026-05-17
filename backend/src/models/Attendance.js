const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const attendanceSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    employee_id: { type: Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    check_in: Date,
    check_out: Date,
    hours_worked: { type: Number, default: 0 },
    status: { type: String, enum: ['Present', 'Absent', 'Late', 'Half Day', 'Holiday', 'Leave'], default: 'Present' },
    notes: String,
    created_by: { type: Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

attendanceSchema.index({ company_id: 1, employee_id: 1, date: 1 }, { unique: true });
attendanceSchema.index({ company_id: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
