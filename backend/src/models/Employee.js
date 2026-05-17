const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    employee_code: { type: String, required: true },
    first_name: { type: String, required: true },
    last_name: String,
    email: String,
    phone: String,
    department: String,
    job_title: String,
    manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    date_of_birth: Date,
    date_of_joining: Date,
    employment_type: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract'],
        default: 'Full-time',
    },
    employment_status: {
        type: String,
        enum: ['Active', 'Inactive', 'On Leave', 'Terminated'],
        default: 'Active',
    },
    salary: { type: mongoose.Decimal128, default: 0 },
    currency: { type: String, default: 'USD' },
    bank_account: String,
    tax_id: String,
    salary_structure_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure' },
    basic_salary: { type: mongoose.Schema.Types.Decimal128, default: 0 },
    is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

employeeSchema.index({ company_id: 1, employee_code: 1 }, { unique: true });

module.exports = mongoose.model('Employee', employeeSchema);
