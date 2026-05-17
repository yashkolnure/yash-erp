const Comment = require('../models/Comment');
const AuditLog = require('../models/AuditLog');

// GET /:companyId/activity/:entityType/:entityId
exports.getFeed = async (req, res) => {
    try {
        const { companyId, entityType, entityId } = req.params;

        const [comments, auditLogs] = await Promise.all([
            Comment.find({ company_id: companyId, entity_type: entityType, entity_id: entityId })
                .populate('user_id', 'first_name last_name email')
                .sort({ created_at: 1 }),
            AuditLog.find({ company_id: companyId, entity_type: entityType, entity_id: entityId })
                .populate('user_id', 'first_name last_name email')
                .sort({ timestamp: 1 })
                .limit(100),
        ]);

        const feed = [
            ...comments.map(c => ({ ...c.toObject(), _feedType: 'comment', _time: c.created_at })),
            ...auditLogs.map(l => ({ ...l.toObject(), _feedType: 'audit', _time: l.timestamp })),
        ].sort((a, b) => new Date(a._time) - new Date(b._time));

        res.json({ success: true, data: feed });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /:companyId/activity/:entityType/:entityId/comments
exports.addComment = async (req, res) => {
    try {
        const { companyId, entityType, entityId } = req.params;
        const { body, is_internal, mentions } = req.body;

        const comment = await Comment.create({
            company_id: companyId,
            entity_type: entityType,
            entity_id: entityId,
            user_id: req.user.userId,
            body,
            is_internal: is_internal || false,
            mentions: mentions || [],
        });

        const populated = await Comment.findById(comment._id).populate('user_id', 'first_name last_name email');

        await AuditLog.create({
            user_id: req.user.userId,
            company_id: companyId,
            entity_type: entityType,
            entity_id: entityId,
            action: is_internal ? 'InternalNote' : 'Comment',
            new_values: { body },
            ip_address: req.ip,
            timestamp: new Date(),
        });

        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /:companyId/activity/comments/:id
exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });
        if (comment.user_id.toString() !== req.user.userId) return res.status(403).json({ error: 'Not your comment' });

        await comment.deleteOne();
        res.json({ success: true, message: 'Comment deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
