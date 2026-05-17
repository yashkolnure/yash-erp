const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

router.post('/:companyId/payments', auth, paymentController.recordPayment);
router.get('/:companyId/payments', auth, paymentController.listPayments);
router.post('/:companyId/payments/apply', auth, paymentController.applyPayment);
router.get('/:companyId/payments/:id/applications', auth, paymentController.getPaymentApplications);
router.get('/:companyId/payments/dashboard', auth, paymentController.getDashboard);

module.exports = router;
