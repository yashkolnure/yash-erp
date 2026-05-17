const ExpenseClaim = require('../models/ExpenseClaim');
const AuditLog = require('../models/AuditLog');

const genClaimNumber = async (companyId) => {
    const count = await ExpenseClaim.countDocuments({ company_id: companyId });
    return `EXP-${String(count + 1).padStart(5, '0')}`;
};

exports.createClaim = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { employee_id, claim_date, lines = [], notes, currency } = req.body;
        const total_amount = lines.reduce((s, l) => s + parseFloat(l.amount || 0), 0);
        const claim_number = await genClaimNumber(companyId);
        const claim = await ExpenseClaim.create({
            company_id: companyId, employee_id, claim_number,
            claim_date: claim_date || new Date(), lines, total_amount, currency: currency || 'USD',
            notes, created_by: req.user.userId,
        });
        res.status(201).json({ success: true, data: claim });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.listClaims = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { employee_id, status, skip = 0, limit = 20 } = req.query;
        const filter = { company_id: companyId };
        if (employee_id) filter.employee_id = employee_id;
        if (status) filter.status = status;
        const [claims, total] = await Promise.all([
            ExpenseClaim.find(filter).populate('employee_id', 'first_name last_name employee_code department').sort({ claim_date: -1 }).skip(+skip).limit(+limit),
            ExpenseClaim.countDocuments(filter),
        ]);
        res.json({ success: true, data: claims, pagination: { total, skip: +skip, limit: +limit } });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getClaim = async (req, res) => {
    try {
        const claim = await ExpenseClaim.findById(req.params.id).populate('employee_id').populate('approved_by', 'first_name last_name');
        if (!claim) return res.status(404).json({ error: 'Expense claim not found' });
        res.json({ success: true, data: claim });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.submitClaim = async (req, res) => {
    try {
        const claim = await ExpenseClaim.findById(req.params.id);
        if (!claim) return res.status(404).json({ error: 'Not found' });
        if (claim.status !== 'Draft') return res.status(400).json({ error: 'Only draft claims can be submitted' });
        claim.status = 'Submitted';
        await claim.save();
        res.json({ success: true, data: claim });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.approveClaim = async (req, res) => {
    try {
        const { companyId } = req.params;
        const claim = await ExpenseClaim.findById(req.params.id);
        if (!claim) return res.status(404).json({ error: 'Not found' });
        if (claim.status !== 'Submitted') return res.status(400).json({ error: 'Only submitted claims can be approved' });
        claim.status = 'Approved';
        claim.approved_by = req.user.userId;
        claim.approved_at = new Date();
        await claim.save();
        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'ExpenseClaim', entity_id: claim._id, action: 'Approve', ip_address: req.ip, timestamp: new Date() });
        res.json({ success: true, data: claim });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.rejectClaim = async (req, res) => {
    try {
        const claim = await ExpenseClaim.findById(req.params.id);
        if (!claim) return res.status(404).json({ error: 'Not found' });
        claim.status = 'Rejected';
        claim.rejection_reason = req.body.reason || '';
        claim.approved_by = req.user.userId;
        claim.approved_at = new Date();
        await claim.save();
        res.json({ success: true, data: claim });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.markPaid = async (req, res) => {
    try {
        const claim = await ExpenseClaim.findById(req.params.id);
        if (!claim) return res.status(404).json({ error: 'Not found' });
        if (claim.status !== 'Approved') return res.status(400).json({ error: 'Only approved claims can be marked paid' });
        claim.status = 'Paid';
        claim.paid_at = new Date();
        await claim.save();
        res.json({ success: true, data: claim });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
