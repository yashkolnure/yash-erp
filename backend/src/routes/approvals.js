const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/approvalController');

router.post('/:companyId/approvals', auth, c.createApproval);
router.get('/:companyId/approvals', auth, c.listApprovals);
router.get('/:companyId/approvals/my-pending', auth, c.getMyPendingApprovals);
router.post('/:companyId/approvals/:id/action', auth, c.actOnApproval);

module.exports = router;
