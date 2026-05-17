const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');

exports.createEmployee = async (req, res) => {
    try {
        const { companyId } = req.params;
        const count = await Employee.countDocuments({ company_id: companyId });
        const employee_code = req.body.employee_code || `EMP-${String(count + 1).padStart(5, '0')}`;

        const employee = await Employee.create({ ...req.body, company_id: companyId, employee_code });

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'Employee', entity_id: employee._id, action: 'Create', new_values: employee.toObject(), ip_address: req.ip, timestamp: new Date() });

        res.status(201).json({ success: true, data: employee });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).populate('manager_id', 'first_name last_name employee_code');
        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        res.json({ success: true, data: employee });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listEmployees = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { department, status, skip = 0, limit = 20 } = req.query;

        const filter = { company_id: companyId, is_active: true };
        if (department) filter.department = department;
        if (status) filter.employment_status = status;

        const [employees, total] = await Promise.all([
            Employee.find(filter).sort({ first_name: 1 }).skip(+skip).limit(+limit),
            Employee.countDocuments(filter),
        ]);

        res.json({ success: true, data: employees, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        res.json({ success: true, data: employee });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.terminateEmployee = async (req, res) => {
    try {
        const { termination_date, reason } = req.body;
        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            { employment_status: 'Terminated', is_active: false },
            { new: true }
        );
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        await AuditLog.create({
            user_id: req.user.userId,
            company_id: req.params.companyId,
            entity_type: 'Employee',
            entity_id: employee._id,
            action: 'Terminate',
            new_values: { termination_date, reason },
            ip_address: req.ip,
            timestamp: new Date(),
        });

        res.json({ success: true, message: 'Employee terminated', data: employee });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.processPayroll = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { pay_period, employee_ids } = req.body;

        const filter = { company_id: companyId, employment_status: 'Active', is_active: true };
        if (employee_ids?.length) filter._id = { $in: employee_ids };

        const employees = await Employee.find(filter);
        const payslips = [];

        for (const emp of employees) {
            const grossSalary = parseFloat(emp.salary?.toString() || 0);
            const taxDeduction = grossSalary * 0.1;
            const netPay = grossSalary - taxDeduction;

            payslips.push({
                employee_id: emp._id,
                employee_code: emp.employee_code,
                employee_name: `${emp.first_name} ${emp.last_name || ''}`.trim(),
                department: emp.department,
                pay_period,
                gross_salary: grossSalary,
                deductions: { income_tax: taxDeduction },
                net_pay: netPay,
                currency: emp.currency || 'USD',
            });
        }

        res.json({
            success: true,
            data: payslips,
            summary: {
                total_employees: payslips.length,
                total_gross: payslips.reduce((s, p) => s + p.gross_salary, 0),
                total_net: payslips.reduce((s, p) => s + p.net_pay, 0),
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDepartments = async (req, res) => {
    try {
        const { companyId } = req.params;
        const departments = await Employee.distinct('department', { company_id: companyId, is_active: true });
        res.json({ success: true, data: departments.filter(Boolean) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
