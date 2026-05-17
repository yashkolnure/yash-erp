const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/quotationController');

router.post('/:companyId/sales/quotations', auth, c.createQuotation);
router.get('/:companyId/sales/quotations', auth, c.listQuotations);
router.get('/:companyId/sales/quotations/:id', auth, c.getQuotation);
router.put('/:companyId/sales/quotations/:id', auth, c.updateQuotation);
router.post('/:companyId/sales/quotations/:id/send', auth, c.sendQuotation);
router.post('/:companyId/sales/quotations/:id/accept', auth, c.acceptQuotation);
router.post('/:companyId/sales/quotations/:id/reject', auth, c.rejectQuotation);
router.post('/:companyId/sales/quotations/:id/convert', auth, c.convertToOrder);
router.put('/:companyId/sales/quotations/:id/assign', auth, c.assignQuotation);
router.post('/:companyId/sales/quotations/:id/duplicate', auth, c.duplicateQuotation);

module.exports = router;
