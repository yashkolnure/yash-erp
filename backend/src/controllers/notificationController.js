const Notification = require('../models/Notification');

exports.listNotifications = async (req, res) => {
    try {
        const { skip = 0, limit = 20, unread_only } = req.query;
        const filter = { user_id: req.user.userId };
        if (unread_only === 'true') filter.read = false;
        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1 }).skip(+skip).limit(+limit),
            Notification.countDocuments(filter),
            Notification.countDocuments({ user_id: req.user.userId, read: false }),
        ]);
        res.json({ success: true, data: notifications, pagination: { total }, unreadCount });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.markRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true, read_at: new Date() });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ user_id: req.user.userId, read: false }, { read: true, read_at: new Date() });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ user_id: req.user.userId, read: false });
        res.json({ success: true, data: { count } });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
