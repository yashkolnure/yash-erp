const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');

// Pre-register all Mongoose models so populate() works across controllers
require('./models/Company');
require('./models/User');
require('./models/Role');
require('./models/RolePermission');
require('./models/UserCompanyAssignment');
require('./models/Customer');
require('./models/Vendor');
require('./models/Product');
require('./models/Warehouse');
require('./models/StockBalance');
require('./models/Employee');
require('./models/ChartOfAccounts');
require('./models/JournalEntry');
require('./models/GLBalance');
require('./models/SalesOrder');
require('./models/Invoice');
require('./models/PurchaseOrder');
require('./models/PurchaseInvoice');
require('./models/GoodsReceiptNote');
require('./models/Payment');
require('./models/PaymentApplication');
require('./models/AuditLog');
require('./models/BankAccount');
require('./models/Message');
require('./models/Comment');
require('./models/Quotation');
require('./models/CreditNote');
require('./models/DebitNote');
require('./models/Lead');
require('./models/LeaveRequest');
require('./models/Attendance');
require('./models/Payslip');
require('./models/StockAdjustment');
require('./models/ExchangeRate');
require('./models/ApprovalRequest');
require('./models/Timesheet');
require('./models/ExpenseClaim');
require('./models/BankStatement');
require('./models/FixedAsset');
require('./models/DepreciationEntry');
require('./models/Budget');
require('./models/Notification');
require('./models/SalaryStructure');
require('./models/AccountingPeriod');
require('./models/RecurringTemplate');

connectDB();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Dashboard
const dashboardController = require('./controllers/dashboardController');
const auth = require('./middleware/auth');
// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1', require('./routes/finance'));
app.use('/api/v1', require('./routes/sales'));
app.use('/api/v1', require('./routes/quotations'));
app.use('/api/v1', require('./routes/creditNotes'));
app.use('/api/v1', require('./routes/procurement'));
app.use('/api/v1', require('./routes/inventory'));
app.use('/api/v1', require('./routes/hr'));
app.use('/api/v1', require('./routes/payments'));
app.use('/api/v1', require('./routes/admin'));
app.use('/api/v1', require('./routes/messages'));
app.use('/api/v1', require('./routes/activity'));
app.use('/api/v1', require('./routes/crm'));
app.use('/api/v1', require('./routes/reports'));
app.use('/api/v1', require('./routes/approvals'));
app.use('/api/v1/:companyId/finance/reconciliation', require('./routes/reconciliation'));
app.use('/api/v1/:companyId/assets', require('./routes/fixedAssets'));
app.use('/api/v1/:companyId/finance/budgets', require('./routes/budgets'));
app.use('/api/v1/:companyId/notifications', require('./routes/notifications'));
app.use('/api/v1/:companyId/hr/salary-structures', require('./routes/salaryStructures'));
app.use('/api/v1', require('./routes/uploads'));
app.use('/api/v1', require('./routes/accountingPeriods'));
app.use('/api/v1', require('./routes/recurring'));
app.use('/api/v1', require('./routes/selfService'));

// Dashboard (inline — no extra route file needed)
app.get('/api/v1/:companyId/dashboard', auth, dashboardController.getDashboard);

app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});

module.exports = app;
