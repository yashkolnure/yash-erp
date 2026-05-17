const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPeriodOpen = require('../middleware/checkPeriodOpen');
const salesOrderController = require('../controllers/salesOrderController');
const customerController = require('../controllers/customerController');
const invoiceController = require('../controllers/invoiceController');

// Customers
router.post('/:companyId/sales/customers', auth, customerController.createCustomer);
router.get('/:companyId/sales/customers', auth, customerController.listCustomers);
router.get('/:companyId/sales/customers/:id', auth, customerController.getCustomer);
router.put('/:companyId/sales/customers/:id', auth, customerController.updateCustomer);
router.delete('/:companyId/sales/customers/:id', auth, customerController.deleteCustomer);
router.get('/:companyId/sales/customers/:customerId/statement', auth, customerController.getCustomerStatement);

// Sales Orders
router.post('/:companyId/sales/orders', auth, salesOrderController.createSalesOrder);
router.get('/:companyId/sales/orders', auth, salesOrderController.listSalesOrders);
router.get('/:companyId/sales/orders/:id', auth, salesOrderController.getSalesOrder);
router.put('/:companyId/sales/orders/:id', auth, salesOrderController.updateSalesOrder);
router.post('/:companyId/sales/orders/:id/confirm', auth, salesOrderController.confirmOrder);
router.post('/:companyId/sales/orders/:id/invoice', auth, salesOrderController.convertToInvoice);
router.put('/:companyId/sales/orders/:id/assign', auth, salesOrderController.assignOrder);

// AR Invoices
router.post('/:companyId/ar/invoices', auth, invoiceController.createInvoice);
router.get('/:companyId/ar/invoices', auth, invoiceController.listInvoices);
router.get('/:companyId/ar/invoices/:id', auth, invoiceController.getInvoice);
router.put('/:companyId/ar/invoices/:id', auth, invoiceController.updateInvoice);
router.post('/:companyId/ar/invoices/:id/post', auth, checkPeriodOpen, invoiceController.postInvoice);
router.post('/:companyId/ar/invoices/:id/cancel', auth, invoiceController.cancelInvoice);
router.post('/:companyId/ar/invoices/:id/email', auth, invoiceController.emailInvoice);
router.get('/:companyId/ar/invoices/:id/pdf', auth, invoiceController.downloadInvoicePDF);
router.put('/:companyId/ar/invoices/:id/assign', auth, invoiceController.assignInvoice);
router.post('/:companyId/ar/invoices/:id/duplicate', auth, invoiceController.duplicateInvoice);
router.post('/:companyId/ar/invoices/:id/send-reminder', auth, invoiceController.sendReminder);
router.get('/:companyId/ar/aging-report', auth, invoiceController.getAgingReport);

module.exports = router;
