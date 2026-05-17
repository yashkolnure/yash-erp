const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/selfServiceController');

router.get('/:companyId/my/profile', auth, c.getMyProfile);
router.get('/:companyId/my/payslips', auth, c.getMyPayslips);
router.get('/:companyId/my/leave', auth, c.getMyLeave);
router.post('/:companyId/my/leave', auth, c.applyForLeave);
router.get('/:companyId/my/timesheets', auth, c.getMyTimesheets);
router.get('/:companyId/my/expenses', auth, c.getMyExpenses);

module.exports = router;
