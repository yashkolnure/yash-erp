const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const hrController = require('../controllers/hrController');
const leaveController = require('../controllers/leaveController');
const payslipController = require('../controllers/payslipController');
const timesheetController = require('../controllers/timesheetController');
const expenseController = require('../controllers/expenseController');

// Employees
router.post('/:companyId/hr/employees', auth, checkPermission('HR', 'create'), hrController.createEmployee);
router.get('/:companyId/hr/employees', auth, hrController.listEmployees);
router.get('/:companyId/hr/employees/:id', auth, hrController.getEmployee);
router.put('/:companyId/hr/employees/:id', auth, checkPermission('HR', 'edit'), hrController.updateEmployee);
router.post('/:companyId/hr/employees/:id/terminate', auth, checkPermission('HR', 'delete'), hrController.terminateEmployee);

// Departments
router.get('/:companyId/hr/departments', auth, hrController.getDepartments);

// Leave
router.post('/:companyId/hr/leave', auth, leaveController.applyLeave);
router.get('/:companyId/hr/leave', auth, leaveController.listLeaves);
router.post('/:companyId/hr/leave/:id/approve', auth, checkPermission('HR', 'approve'), leaveController.approveLeave);
router.post('/:companyId/hr/leave/:id/reject', auth, checkPermission('HR', 'approve'), leaveController.rejectLeave);
router.get('/:companyId/hr/employees/:employeeId/leave-balance', auth, leaveController.getLeaveBalance);

// Attendance
router.post('/:companyId/hr/attendance', auth, leaveController.markAttendance);
router.get('/:companyId/hr/attendance', auth, leaveController.listAttendance);
router.get('/:companyId/hr/attendance/summary', auth, leaveController.getAttendanceSummary);

// Payslips
router.post('/:companyId/payroll/payslips', auth, checkPermission('HR', 'create'), payslipController.generatePayslip);
router.post('/:companyId/payroll/payslips/bulk', auth, checkPermission('HR', 'create'), payslipController.bulkGeneratePayslips);
router.get('/:companyId/payroll/payslips', auth, payslipController.listPayslips);
router.get('/:companyId/payroll/payslips/:id', auth, payslipController.getPayslip);
router.post('/:companyId/payroll/payslips/:id/approve', auth, checkPermission('HR', 'approve'), payslipController.approvePayslip);
router.post('/:companyId/payroll/payslips/:id/mark-paid', auth, checkPermission('HR', 'post'), payslipController.markPayslipPaid);

// Legacy payroll route
router.post('/:companyId/payroll/process', auth, hrController.processPayroll);

// Timesheets
router.post('/:companyId/hr/timesheets', auth, timesheetController.createTimesheet);
router.get('/:companyId/hr/timesheets', auth, timesheetController.listTimesheets);
router.get('/:companyId/hr/timesheets/:id', auth, timesheetController.getTimesheet);
router.put('/:companyId/hr/timesheets/:id', auth, timesheetController.updateTimesheet);
router.post('/:companyId/hr/timesheets/:id/submit', auth, timesheetController.submitTimesheet);
router.post('/:companyId/hr/timesheets/:id/approve', auth, checkPermission('HR', 'approve'), timesheetController.approveTimesheet);

// Expense Claims
router.post('/:companyId/hr/expense-claims', auth, expenseController.createClaim);
router.get('/:companyId/hr/expense-claims', auth, expenseController.listClaims);
router.get('/:companyId/hr/expense-claims/:id', auth, expenseController.getClaim);
router.post('/:companyId/hr/expense-claims/:id/submit', auth, expenseController.submitClaim);
router.post('/:companyId/hr/expense-claims/:id/approve', auth, checkPermission('HR', 'approve'), expenseController.approveClaim);
router.post('/:companyId/hr/expense-claims/:id/reject', auth, checkPermission('HR', 'approve'), expenseController.rejectClaim);
router.post('/:companyId/hr/expense-claims/:id/mark-paid', auth, checkPermission('HR', 'post'), expenseController.markPaid);

module.exports = router;
