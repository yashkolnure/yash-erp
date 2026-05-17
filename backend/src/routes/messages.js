const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/messageController');

router.get('/:companyId/messages', auth, c.listMessages);
router.post('/:companyId/messages', auth, c.sendMessage);
router.get('/:companyId/messages/unread-count', auth, c.getUnreadCount);
router.get('/:companyId/messages/users', auth, c.getCompanyUsers);
router.get('/:companyId/messages/:id', auth, c.getMessage);
router.put('/:companyId/messages/:id/archive', auth, c.archiveMessage);

module.exports = router;
