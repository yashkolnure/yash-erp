const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');

const generatePayslipNumber = async (companyId, period_start) => {
    const month = new Date(period_start).toISOString().slice(0, 7).replace('-', '');
    const count = await Payslip.countDocuments({ company_id: companyId });
    return `PAY-${month}-${String(count + 1).padStart(4, '0')}`;
};

exports.generatePayslip = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { employee_id, period_start, period_end, earnings = [], deductions = [], overtime_hours = 0, notes } = req.body;

        const employee = await Employee.findById(employee_id);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });

        const start = new Date(period_start);
        const end = new Date(period_end);

        // Attendance stats for the period
        const attendance = await Attendance.find({
            company_id: companyId, employee_id,
            date: { $gte: start, $lte: end },
        });

        const working_days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const present_days = attendance.filter(a => ['Present', 'Late'].includes(a.status)).length + attendance.filter(a => a.status === 'Half Day').length * 0.5;
        const absent_days = attendance.filter(a => a.status === 'Absent').length;
        const leave_days = attendance.filter(a => a.status === 'Leave').length;

        const basic_salary = parseFloat(employee.salary?.toString() || 0);
        const daily_rate = basic_salary / working_days;
        const earned_basic = daily_rate * present_days;

        const gross_salary = earned_basic + earnings.reduce((s, e) => s + parseFloat(e.amount || 0), 0) + (overtime_hours * (daily_rate / 8) * 1.5);
        const total_deductions = deductions.reduce((s, d) => s + parseFloat(d.amount || 0), 0);
        const net_salary = gross_salary - total_deductions;

        const payslip_number = await generatePayslipNumber(companyId, period_start);

        const payslip = await Payslip.create({
            company_id: companyId, employee_id, payslip_number,
            period_start: start, period_end: end,
            basic_salary: earned_basic,
            earnings: [{ label: 'Basic Salary', amount: earned_basic }, ...earnings],
            gross_salary, deductions, total_deductions, net_salary,
            currency: employee.currency || 'USD',
            working_days, present_days, absent_days, leave_days,
            overtime_hours, notes, created_by: req.user.userId,
        });

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'Payslip', entity_id: payslip._id, action: 'Create', ip_address: req.ip, timestamp: new Date() });

        res.status(201).json({ success: true, data: payslip });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listPayslips = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { employee_id, status, skip = 0, limit = 20 } = req.query;
        const filter = { company_id: companyId };
        if (employee_id) filter.employee_id = employee_id;
        if (status) filter.status = status;
        const [payslips, total] = await Promise.all([
            Payslip.find(filter).populate('employee_id', 'first_name last_name employee_code department').sort({ period_start: -1 }).skip(+skip).limit(+limit),
            Payslip.countDocuments(filter),
        ]);
        res.json({ success: true, data: payslips, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getPayslip = async (req, res) => {
    try {
        const payslip = await Payslip.findById(req.params.id).populate('employee_id');
        if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
        res.json({ success: true, data: payslip });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.approvePayslip = async (req, res) => {
    try {
        const payslip = await Payslip.findById(req.params.id);
        if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
        payslip.status = 'Approved';
        payslip.approved_by = req.user.userId;
        payslip.approved_at = new Date();
        await payslip.save();
        res.json({ success: true, data: payslip });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.markPayslipPaid = async (req, res) => {
    try {
        const payslip = await Payslip.findById(req.params.id);
        if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
        if (payslip.status !== 'Approved') return res.status(400).json({ error: 'Only approved payslips can be marked paid' });
        payslip.status = 'Paid';
        payslip.pay_date = new Date();
        await payslip.save();
        res.json({ success: true, data: payslip });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.bulkGeneratePayslips = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { period_start, period_end, deductions = [] } = req.body;

        const employees = await Employee.find({ company_id: companyId, is_active: true });
        const results = [];

        for (const emp of employees) {
            try {
                const existing = await Payslip.findOne({ company_id: companyId, employee_id: emp._id, period_start: new Date(period_start) });
                if (existing) { results.push({ employee: emp.first_name, status: 'skipped', reason: 'Already exists' }); continue; }

                const payslip_number = await generatePayslipNumber(companyId, period_start);
                const basic_salary = parseFloat(emp.salary?.toString() || 0);
                const total_deductions = deductions.reduce((s, d) => s + parseFloat(d.amount || 0), 0);

                await Payslip.create({
                    company_id: companyId, employee_id: emp._id, payslip_number,
                    period_start: new Date(period_start), period_end: new Date(period_end),
                    basic_salary, earnings: [{ label: 'Basic Salary', amount: basic_salary }],
                    gross_salary: basic_salary, deductions, total_deductions,
                    net_salary: basic_salary - total_deductions,
                    currency: emp.currency || 'USD', created_by: req.user.userId,
                });
                results.push({ employee: `${emp.first_name} ${emp.last_name}`, status: 'created' });
            } catch (e) {
                results.push({ employee: `${emp.first_name} ${emp.last_name}`, status: 'error', reason: e.message });
            }
        }

        res.json({ success: true, data: results, message: `Processed ${employees.length} employees` });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
