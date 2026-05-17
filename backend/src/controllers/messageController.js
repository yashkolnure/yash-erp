const Message = require('../models/Message');
const User = require('../models/User');
const UserCompanyAssignment = require('../models/UserCompanyAssignment');

exports.listMessages = async (req, res) => {
    try {
        const { companyId } = req.params;
        const userId = req.user.userId;
        const { folder = 'inbox', entity_type, entity_id, skip = 0, limit = 30 } = req.query;

        const filter = { company_id: companyId, parent_id: null, is_archived: false };

        if (folder === 'inbox') filter.recipients = userId;
        else if (folder === 'sent') filter.sender_id = userId;
        else if (folder === 'all') filter.$or = [{ sender_id: userId }, { recipients: userId }];

        if (entity_type) filter.entity_type = entity_type;
        if (entity_id) filter.entity_id = entity_id;

        const [messages, total] = await Promise.all([
            Message.find(filter)
                .populate('sender_id', 'first_name last_name email')
                .populate('recipients', 'first_name last_name email')
                .sort({ created_at: -1 })
                .skip(+skip).limit(+limit),
            Message.countDocuments(filter),
        ]);

        const unreadCount = await Message.countDocuments({
            company_id: companyId,
            recipients: userId,
            read_by: { $ne: userId },
            is_archived: false,
        });

        res.json({ success: true, data: messages, pagination: { total, skip: +skip, limit: +limit }, unread: unreadCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMessage = async (req, res) => {
    try {
        const msg = await Message.findById(req.params.id)
            .populate('sender_id', 'first_name last_name email')
            .populate('recipients', 'first_name last_name email');
        if (!msg) return res.status(404).json({ error: 'Message not found' });

        // Mark as read
        if (!msg.read_by.includes(req.user.userId)) {
            msg.read_by.push(req.user.userId);
            await msg.save();
        }

        // Fetch replies
        const replies = await Message.find({ parent_id: msg._id })
            .populate('sender_id', 'first_name last_name email')
            .sort({ created_at: 1 });

        res.json({ success: true, data: msg, replies });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { subject, body, recipients, entity_type, entity_id, entity_ref, priority, parent_id } = req.body;

        const msg = await Message.create({
            company_id: companyId,
            sender_id: req.user.userId,
            subject,
            body,
            recipients: recipients || [],
            entity_type: entity_type || 'General',
            entity_id: entity_id || null,
            entity_ref: entity_ref || null,
            priority: priority || 'Normal',
            parent_id: parent_id || null,
        });

        const populated = await Message.findById(msg._id)
            .populate('sender_id', 'first_name last_name email')
            .populate('recipients', 'first_name last_name email');

        res.status(201).json({ success: true, data: populated, message: 'Message sent' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.archiveMessage = async (req, res) => {
    try {
        await Message.findByIdAndUpdate(req.params.id, { $set: { is_archived: true } });
        res.json({ success: true, message: 'Message archived' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Message.countDocuments({
            company_id: req.params.companyId,
            recipients: req.user.userId,
            read_by: { $ne: req.user.userId },
            is_archived: false,
        });
        res.json({ success: true, count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getCompanyUsers = async (req, res) => {
    try {
        const assignments = await UserCompanyAssignment.find({ company_id: req.params.companyId, is_active: true })
            .populate('user_id', 'first_name last_name email');
        const users = assignments.map(a => a.user_id).filter(Boolean);
        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
