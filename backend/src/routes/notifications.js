const router = require('express').Router({ mergeParams: true });
const auth = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');
router.use(auth);
router.get('/', ctrl.listNotifications);
router.get('/unread-count', ctrl.getUnreadCount);
router.post('/mark-all-read', ctrl.markAllRead);
router.post('/:id/read', ctrl.markRead);
module.exports = router;
