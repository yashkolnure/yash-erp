const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const c = require('../controllers/accountingPeriodController');

router.get('/:companyId/finance/periods', auth, c.listPeriods);
router.get('/:companyId/finance/periods/status', auth, c.getPeriodStatus);
router.post('/:companyId/finance/periods/open', auth, checkPermission('Finance', 'update'), c.openPeriod);
router.post('/:companyId/finance/periods/close', auth, checkPermission('Finance', 'update'), c.closePeriod);

module.exports = router;
