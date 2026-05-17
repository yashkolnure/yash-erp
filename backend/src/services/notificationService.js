const Notification = require('../models/Notification');

const notify = async ({ company_id, user_id, title, message, type = 'info', entity_type, entity_id, link }) => {
    try {
        await Notification.create({ company_id, user_id, title, message, type, entity_type, entity_id, link });
    } catch (e) { console.error('Notification error:', e.message); }
};

module.exports = { notify };
