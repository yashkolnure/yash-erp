const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const inventoryController = require('../controllers/inventoryController');
const stockAdjustmentController = require('../controllers/stockAdjustmentController');

// Products
router.post('/:companyId/inventory/products', auth, inventoryController.createProduct);
router.get('/:companyId/inventory/products', auth, inventoryController.listProducts);
router.get('/:companyId/inventory/products/:id', auth, inventoryController.getProduct);
router.put('/:companyId/inventory/products/:id', auth, inventoryController.updateProduct);

// Warehouses
router.post('/:companyId/inventory/warehouses', auth, inventoryController.createWarehouse);
router.get('/:companyId/inventory/warehouses', auth, inventoryController.listWarehouses);

// Stock levels & transfer
router.get('/:companyId/inventory/stock', auth, inventoryController.getStockLevels);
router.post('/:companyId/inventory/transfer', auth, inventoryController.stockTransfer);
router.get('/:companyId/inventory/transfers', auth, inventoryController.listTransfers);

// Stock Adjustments
router.post('/:companyId/inventory/adjustments', auth, stockAdjustmentController.createAdjustment);
router.get('/:companyId/inventory/adjustments', auth, stockAdjustmentController.listAdjustments);
router.get('/:companyId/inventory/adjustments/:id', auth, stockAdjustmentController.getAdjustment);
router.post('/:companyId/inventory/adjustments/:id/post', auth, stockAdjustmentController.postAdjustment);

// Valuation & Alerts
router.get('/:companyId/inventory/valuation', auth, stockAdjustmentController.getStockValuation);
router.get('/:companyId/inventory/reorder-alerts', auth, stockAdjustmentController.getReorderAlerts);

module.exports = router;
