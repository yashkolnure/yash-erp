const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const c = require('../controllers/adminController');
const { getMyPermissions } = require('../middleware/checkPermission');
const xr = require('../controllers/exchangeRateController');

// My permissions (used by frontend to control UI visibility)
router.get('/:companyId/admin/my-permissions', auth, getMyPermissions);

// Company Profile
router.get('/:companyId/admin/company', auth, c.getCompanyProfile);
router.put('/:companyId/admin/company', auth, c.updateCompanyProfile);

// Bank Accounts
router.get('/:companyId/admin/bank-accounts', auth, c.listBankAccounts);
router.post('/:companyId/admin/bank-accounts', auth, c.createBankAccount);
router.put('/:companyId/admin/bank-accounts/:id', auth, c.updateBankAccount);
router.delete('/:companyId/admin/bank-accounts/:id', auth, c.deleteBankAccount);

// Users
router.get('/:companyId/admin/users', auth, c.listUsers);
router.post('/:companyId/admin/invite', auth, c.inviteUser);
router.put('/:companyId/admin/users/:assignmentId/role', auth, c.updateUserRole);
router.delete('/:companyId/admin/users/:assignmentId', auth, c.removeUser);

// Roles & Permissions
router.get('/:companyId/admin/roles', auth, c.listRoles);
router.post('/:companyId/admin/roles', auth, c.createRole);
router.put('/:companyId/admin/roles/:roleId', auth, c.updateRole);
router.get('/:companyId/admin/roles/:roleId/permissions', auth, c.getRolePermissions);
router.put('/:companyId/admin/roles/:roleId/permissions', auth, c.setRolePermissions);

// Exchange Rates
router.get('/:companyId/admin/exchange-rates', auth, xr.listRates);
router.post('/:companyId/admin/exchange-rates', auth, xr.createRate);
router.put('/:companyId/admin/exchange-rates/:id', auth, xr.updateRate);
router.delete('/:companyId/admin/exchange-rates/:id', auth, xr.deleteRate);
router.get('/:companyId/admin/exchange-rate', auth, xr.getRate);

module.exports = router;
