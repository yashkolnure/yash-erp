const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/activityController');

router.get('/:companyId/activity/:entityType/:entityId', auth, c.getFeed);
router.post('/:companyId/activity/:entityType/:entityId/comments', auth, c.addComment);
router.delete('/:companyId/activity/comments/:id', auth, c.deleteComment);

module.exports = router;
