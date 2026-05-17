const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const checkPeriodOpen = require('../middleware/checkPeriodOpen');
const poController = require('../controllers/poController');
const debitNoteController = require('../controllers/debitNoteController');

// Vendors
router.post('/:companyId/procurement/vendors', auth, poController.createVendor);
router.get('/:companyId/procurement/vendors', auth, poController.listVendors);
router.get('/:companyId/procurement/vendors/:id/statement', auth, poController.getVendorStatement);

// Purchase Orders
router.post('/:companyId/procurement/po', auth, checkPermission('Procurement', 'create'), poController.createPO);
router.get('/:companyId/procurement/po', auth, poController.listPOs);
router.get('/:companyId/procurement/po/:id', auth, poController.getPO);
router.post('/:companyId/procurement/po/:id/confirm', auth, checkPermission('Procurement', 'post'), poController.confirmPO);
router.post('/:companyId/procurement/po/:id/duplicate', auth, checkPermission('Procurement', 'create'), poController.duplicatePO);
router.put('/:companyId/procurement/po/:id/assign', auth, poController.assignPO);

// Goods Receipt Notes
router.post('/:companyId/procurement/grn', auth, checkPermission('Procurement', 'create'), poController.createGRN);
router.get('/:companyId/procurement/grn', auth, poController.listGRNs);

// Purchase Invoices (Bills)
router.post('/:companyId/procurement/bills', auth, checkPermission('Finance', 'create'), poController.createPurchaseInvoice);
router.get('/:companyId/procurement/bills', auth, poController.listPurchaseInvoices);
router.get('/:companyId/procurement/bills/:id', auth, poController.getPurchaseInvoice);
router.post('/:companyId/procurement/bills/:id/post', auth, checkPermission('Finance', 'post'), checkPeriodOpen, poController.postPurchaseInvoice);

// Debit Notes
router.get('/:companyId/procurement/debit-notes', auth, debitNoteController.listDebitNotes);
router.post('/:companyId/procurement/debit-notes', auth, checkPermission('Procurement', 'create'), debitNoteController.createDebitNote);
router.get('/:companyId/procurement/debit-notes/:id', auth, debitNoteController.getDebitNote);
router.post('/:companyId/procurement/debit-notes/:id/post', auth, checkPermission('Procurement', 'post'), checkPeriodOpen, debitNoteController.postDebitNote);
router.post('/:companyId/procurement/debit-notes/:id/void', auth, debitNoteController.voidDebitNote);

module.exports = router;
