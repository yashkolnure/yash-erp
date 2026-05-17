const Timesheet = require('../models/Timesheet');
const AuditLog = require('../models/AuditLog');

exports.createTimesheet = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { employee_id, week_start, week_end, entries = [] } = req.body;

        const total_hours = entries.reduce((s, e) => s + parseFloat(e.hours || 0), 0);
        const billable_hours = entries.filter(e => e.billable).reduce((s, e) => s + parseFloat(e.hours || 0), 0);

        const ts = await Timesheet.create({
            company_id: companyId, employee_id,
            week_start: new Date(week_start), week_end: new Date(week_end),
            entries, total_hours, billable_hours,
            created_by: req.user.userId,
        });

        res.status(201).json({ success: true, data: ts });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listTimesheets = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { employee_id, status, skip = 0, limit = 20 } = req.query;
        const filter = { company_id: companyId };
        if (employee_id) filter.employee_id = employee_id;
        if (status) filter.status = status;
        const [timesheets, total] = await Promise.all([
            Timesheet.find(filter).populate('employee_id', 'first_name last_name employee_code').sort({ week_start: -1 }).skip(+skip).limit(+limit),
            Timesheet.countDocuments(filter),
        ]);
        res.json({ success: true, data: timesheets, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getTimesheet = async (req, res) => {
    try {
        const ts = await Timesheet.findById(req.params.id).populate('employee_id', 'first_name last_name employee_code department');
        if (!ts) return res.status(404).json({ error: 'Timesheet not found' });
        res.json({ success: true, data: ts });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateTimesheet = async (req, res) => {
    try {
        const ts = await Timesheet.findById(req.params.id);
        if (!ts) return res.status(404).json({ error: 'Timesheet not found' });
        if (ts.status !== 'Draft') return res.status(400).json({ error: 'Only draft timesheets can be edited' });

        const { entries } = req.body;
        if (entries) {
            ts.entries = entries;
            ts.total_hours = entries.reduce((s, e) => s + parseFloat(e.hours || 0), 0);
            ts.billable_hours = entries.filter(e => e.billable).reduce((s, e) => s + parseFloat(e.hours || 0), 0);
        }
        await ts.save();
        res.json({ success: true, data: ts });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.submitTimesheet = async (req, res) => {
    try {
        const ts = await Timesheet.findById(req.params.id);
        if (!ts) return res.status(404).json({ error: 'Timesheet not found' });
        if (ts.status !== 'Draft') return res.status(400).json({ error: 'Only draft timesheets can be submitted' });
        ts.status = 'Submitted';
        await ts.save();
        res.json({ success: true, data: ts });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.approveTimesheet = async (req, res) => {
    try {
        const { companyId } = req.params;
        const ts = await Timesheet.findById(req.params.id);
        if (!ts) return res.status(404).json({ error: 'Timesheet not found' });
        const { action, rejection_reason } = req.body;
        ts.status = action === 'approve' ? 'Approved' : 'Rejected';
        if (action === 'reject') ts.rejection_reason = rejection_reason || '';
        ts.approved_by = req.user.userId;
        ts.approved_at = new Date();
        await ts.save();
        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'Timesheet', entity_id: ts._id, action: action === 'approve' ? 'Approve' : 'Reject', ip_address: req.ip, timestamp: new Date() });
        res.json({ success: true, data: ts });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
