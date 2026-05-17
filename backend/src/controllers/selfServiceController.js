const Employee = require('../models/Employee');
const Payslip = require('../models/Payslip');
const LeaveRequest = require('../models/LeaveRequest');
const Timesheet = require('../models/Timesheet');
const ExpenseClaim = require('../models/ExpenseClaim');

/* Helper — find the Employee record for the logged-in user */
const findMyEmployee = async (companyId, userId) =>
    Employee.findOne({ company_id: companyId, user_id: userId });

/* GET /:companyId/my/profile */
exports.getMyProfile = async (req, res) => {
    try {
        const { companyId } = req.params;
        const employee = await findMyEmployee(companyId, req.user.userId);
        if (!employee) return res.status(404).json({ error: 'Employee profile not found. Ask your HR admin to link your user account to an employee record.' });
        res.json({ success: true, data: employee });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* GET /:companyId/my/payslips */
exports.getMyPayslips = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { skip = 0, limit = 20 } = req.query;
        const employee = await findMyEmployee(companyId, req.user.userId);
        if (!employee) return res.status(404).json({ error: 'Employee profile not found' });

        const filter = { company_id: companyId, employee_id: employee._id };
        const [payslips, total] = await Promise.all([
            Payslip.find(filter).sort({ period_start: -1 }).skip(+skip).limit(+limit),
            Payslip.countDocuments(filter),
        ]);
        res.json({ success: true, data: payslips, pagination: { total, skip: +skip, limit: +limit } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* GET /:companyId/my/leave */
exports.getMyLeave = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { skip = 0, limit = 20 } = req.query;
        const employee = await findMyEmployee(companyId, req.user.userId);
        if (!employee) return res.status(404).json({ error: 'Employee profile not found' });

        const filter = { company_id: companyId, employee_id: employee._id };
        const [leaves, total] = await Promise.all([
            LeaveRequest.find(filter).sort({ created_at: -1 }).skip(+skip).limit(+limit),
            LeaveRequest.countDocuments(filter),
        ]);
        res.json({ success: true, data: leaves, pagination: { total, skip: +skip, limit: +limit } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* POST /:companyId/my/leave */
exports.applyForLeave = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { leave_type, start_date, end_date, reason, half_day } = req.body;

        const employee = await findMyEmployee(companyId, req.user.userId);
        if (!employee) return res.status(404).json({ error: 'Employee profile not found' });

        const start = new Date(start_date);
        const end = new Date(end_date);
        const days = half_day ? 0.5 : Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        const leave = await LeaveRequest.create({
            company_id: companyId,
            employee_id: employee._id,
            leave_type,
            start_date: start,
            end_date: end,
            days,
            half_day: !!half_day,
            reason,
            status: 'Pending',
            created_by: req.user.userId,
        });

        res.status(201).json({ success: true, data: leave });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* GET /:companyId/my/timesheets */
exports.getMyTimesheets = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { skip = 0, limit = 20 } = req.query;
        const employee = await findMyEmployee(companyId, req.user.userId);
        if (!employee) return res.status(404).json({ error: 'Employee profile not found' });

        const filter = { company_id: companyId, employee_id: employee._id };
        const [timesheets, total] = await Promise.all([
            Timesheet.find(filter).sort({ week_start: -1 }).skip(+skip).limit(+limit),
            Timesheet.countDocuments(filter),
        ]);
        res.json({ success: true, data: timesheets, pagination: { total, skip: +skip, limit: +limit } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/* GET /:companyId/my/expenses */
exports.getMyExpenses = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { skip = 0, limit = 20 } = req.query;
        const employee = await findMyEmployee(companyId, req.user.userId);
        if (!employee) return res.status(404).json({ error: 'Employee profile not found' });

        const filter = { company_id: companyId, employee_id: employee._id };
        const [claims, total] = await Promise.all([
            ExpenseClaim.find(filter).sort({ claim_date: -1 }).skip(+skip).limit(+limit),
            ExpenseClaim.countDocuments(filter),
        ]);
        res.json({ success: true, data: claims, pagination: { total, skip: +skip, limit: +limit } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
