const ApprovalRequest = require('../models/ApprovalRequest');
const AuditLog = require('../models/AuditLog');

exports.createApproval = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { entity_type, entity_id, entity_ref, approvers, description, amount, currency } = req.body;

        const steps = (approvers || []).map((approver_id, i) => ({ approver_id, order: i + 1, status: 'Pending' }));

        const approval = await ApprovalRequest.create({
            company_id: companyId, entity_type, entity_id, entity_ref,
            requested_by: req.user.userId, description, amount, currency, steps,
        });

        res.status(201).json({ success: true, data: approval });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listApprovals = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, entity_type, my_approvals } = req.query;
        const filter = { company_id: companyId };
        if (status) filter.status = status;
        if (entity_type) filter.entity_type = entity_type;
        if (my_approvals === 'true') filter['steps.approver_id'] = req.user.userId;

        const approvals = await ApprovalRequest.find(filter)
            .populate('requested_by', 'first_name last_name email')
            .populate('steps.approver_id', 'first_name last_name')
            .sort({ created_at: -1 });

        res.json({ success: true, data: approvals });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.actOnApproval = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const { action, comments } = req.body; // action: 'approve' | 'reject'

        const approval = await ApprovalRequest.findById(id);
        if (!approval) return res.status(404).json({ error: 'Approval request not found' });
        if (approval.status !== 'Pending') return res.status(400).json({ error: 'Approval is not pending' });

        const step = approval.steps.find(s => s.approver_id.toString() === req.user.userId && s.status === 'Pending');
        if (!step) return res.status(403).json({ error: 'Not authorized to act on this approval' });

        step.status = action === 'approve' ? 'Approved' : 'Rejected';
        step.comments = comments;
        step.acted_at = new Date();

        if (action === 'reject') {
            approval.status = 'Rejected';
        } else {
            const allApproved = approval.steps.every(s => s.status === 'Approved');
            if (allApproved) { approval.status = 'Approved'; approval.completed_at = new Date(); }
        }

        await approval.save();
        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'ApprovalRequest', entity_id: approval._id, action: action === 'approve' ? 'Approve' : 'Reject', new_values: { comments }, ip_address: req.ip, timestamp: new Date() });

        res.json({ success: true, data: approval });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getMyPendingApprovals = async (req, res) => {
    try {
        const { companyId } = req.params;
        const approvals = await ApprovalRequest.find({
            company_id: companyId, status: 'Pending',
            'steps': { $elemMatch: { approver_id: req.user.userId, status: 'Pending' } },
        }).populate('requested_by', 'first_name last_name email').sort({ created_at: -1 });
        res.json({ success: true, data: approvals, count: approvals.length });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
