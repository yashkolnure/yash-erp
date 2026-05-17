const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');

/* ── Leave Requests ─────────────────────────────────────────────────────── */
exports.applyLeave = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { employee_id, leave_type, start_date, end_date, reason, half_day } = req.body;

        const start = new Date(start_date);
        const end = new Date(end_date);
        const days = half_day ? 0.5 : Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        const leave = await LeaveRequest.create({
            company_id: companyId, employee_id, leave_type,
            start_date: start, end_date: end, days, half_day: !!half_day,
            reason, created_by: req.user.userId,
        });

        res.status(201).json({ success: true, data: leave });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listLeaves = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, employee_id, leave_type, skip = 0, limit = 20 } = req.query;
        const filter = { company_id: companyId };
        if (status) filter.status = status;
        if (employee_id) filter.employee_id = employee_id;
        if (leave_type) filter.leave_type = leave_type;
        const [leaves, total] = await Promise.all([
            LeaveRequest.find(filter).populate('employee_id', 'first_name last_name employee_code department').populate('approved_by', 'first_name last_name').sort({ created_at: -1 }).skip(+skip).limit(+limit),
            LeaveRequest.countDocuments(filter),
        ]);
        res.json({ success: true, data: leaves, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.approveLeave = async (req, res) => {
    try {
        const leave = await LeaveRequest.findById(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave request not found' });
        if (leave.status !== 'Pending') return res.status(400).json({ error: 'Leave is not pending' });
        leave.status = 'Approved';
        leave.approved_by = req.user.userId;
        leave.approved_at = new Date();
        await leave.save();
        await AuditLog.create({ user_id: req.user.userId, company_id: req.params.companyId, entity_type: 'LeaveRequest', entity_id: leave._id, action: 'Approve', ip_address: req.ip, timestamp: new Date() });
        res.json({ success: true, data: leave });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.rejectLeave = async (req, res) => {
    try {
        const leave = await LeaveRequest.findById(req.params.id);
        if (!leave) return res.status(404).json({ error: 'Leave request not found' });
        leave.status = 'Rejected';
        leave.rejection_reason = req.body.reason || '';
        leave.approved_by = req.user.userId;
        leave.approved_at = new Date();
        await leave.save();
        res.json({ success: true, data: leave });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getLeaveBalance = async (req, res) => {
    try {
        const { companyId, employeeId } = req.params;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);

        const leaves = await LeaveRequest.find({
            company_id: companyId, employee_id: employeeId,
            status: 'Approved',
            start_date: { $gte: startOfYear, $lte: endOfYear },
        });

        const ANNUAL_ENTITLEMENT = { Annual: 21, Sick: 10, Casual: 7, Maternity: 90, Paternity: 5, Unpaid: 0, Other: 0 };
        const used = {};
        for (const l of leaves) {
            used[l.leave_type] = (used[l.leave_type] || 0) + l.days;
        }

        const balance = Object.entries(ANNUAL_ENTITLEMENT).map(([type, entitlement]) => ({
            leave_type: type, entitlement, used: used[type] || 0, remaining: entitlement - (used[type] || 0),
        }));

        res.json({ success: true, data: balance, year });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

/* ── Attendance ─────────────────────────────────────────────────────────── */
exports.markAttendance = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { employee_id, date, check_in, check_out, status, notes } = req.body;

        const d = new Date(date);
        d.setHours(0, 0, 0, 0);

        let hours_worked = 0;
        if (check_in && check_out) {
            hours_worked = (new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60);
        }

        const record = await Attendance.findOneAndUpdate(
            { company_id: companyId, employee_id, date: d },
            { check_in, check_out, hours_worked, status: status || 'Present', notes, created_by: req.user.userId },
            { upsert: true, new: true }
        );
        res.json({ success: true, data: record });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listAttendance = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { employee_id, from_date, to_date, skip = 0, limit = 50 } = req.query;
        const filter = { company_id: companyId };
        if (employee_id) filter.employee_id = employee_id;
        if (from_date || to_date) {
            filter.date = {};
            if (from_date) filter.date.$gte = new Date(from_date);
            if (to_date) filter.date.$lte = new Date(to_date);
        }
        const [records, total] = await Promise.all([
            Attendance.find(filter).populate('employee_id', 'first_name last_name employee_code department').sort({ date: -1 }).skip(+skip).limit(+limit),
            Attendance.countDocuments(filter),
        ]);
        res.json({ success: true, data: records, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getAttendanceSummary = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { month, year } = req.query;
        const m = parseInt(month) - 1 || new Date().getMonth();
        const y = parseInt(year) || new Date().getFullYear();
        const from = new Date(y, m, 1);
        const to = new Date(y, m + 1, 0);

        const records = await Attendance.find({ company_id: companyId, date: { $gte: from, $lte: to } }).populate('employee_id', 'first_name last_name employee_code');

        const summary = {};
        for (const r of records) {
            const eid = r.employee_id?._id?.toString();
            if (!eid) continue;
            if (!summary[eid]) summary[eid] = { employee: r.employee_id, present: 0, absent: 0, late: 0, half_day: 0, total_hours: 0 };
            if (r.status === 'Present') summary[eid].present++;
            if (r.status === 'Absent') summary[eid].absent++;
            if (r.status === 'Late') { summary[eid].present++; summary[eid].late++; }
            if (r.status === 'Half Day') summary[eid].half_day++;
            summary[eid].total_hours += r.hours_worked || 0;
        }

        res.json({ success: true, data: Object.values(summary), month: m + 1, year: y });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
