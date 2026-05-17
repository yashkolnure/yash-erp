const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/reportController');

router.get('/:companyId/reports/profit-loss', auth, c.getProfitLoss);
router.get('/:companyId/reports/balance-sheet', auth, c.getBalanceSheet);
router.get('/:companyId/reports/cash-flow', auth, c.getCashFlow);
router.get('/:companyId/reports/tax', auth, c.getTaxReport);
router.get('/:companyId/reports/audit-logs', auth, c.getAuditLogs);
router.get('/:companyId/reports/sales-analytics', auth, c.getSalesAnalytics);
router.get('/:companyId/reports/ap-aging', auth, c.getAPAging);
router.get('/:companyId/reports/ar-aging', auth, c.getARAging);

module.exports = router;
