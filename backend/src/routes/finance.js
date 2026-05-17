const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checkPeriodOpen = require('../middleware/checkPeriodOpen');
const financeController = require('../controllers/financeController');

// Dashboard
router.get('/:companyId/dashboard', auth, financeController.getDashboard);

// Chart of Accounts
router.post('/:companyId/finance/accounts', auth, financeController.createAccount);
router.get('/:companyId/finance/accounts', auth, financeController.listAccounts);
router.put('/:companyId/finance/accounts/:id', auth, financeController.updateAccount);

// Journal Entries
router.post('/:companyId/finance/journals', auth, checkPeriodOpen, financeController.createJournalEntry);
router.get('/:companyId/finance/journals', auth, financeController.listJournalEntries);
router.post('/:companyId/finance/journals/:id/post', auth, checkPeriodOpen, financeController.postJournalEntry);

// Reports
router.get('/:companyId/finance/trial-balance', auth, financeController.getTrialBalance);

module.exports = router;
