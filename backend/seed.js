/**
 * Seed script — creates a demo company, admin user, and chart of accounts.
 * Run once: node scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_db';

const run = async () => {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = require('./src/models/User');
    const Company = require('./src/models/Company');
    const Role = require('./src/models/Role');
    const RolePermission = require('./src/models/RolePermission');
    const UserCompanyAssignment = require('./src/models/UserCompanyAssignment');
    const ChartOfAccounts = require('./src/models/ChartOfAccounts');

    // Company
    let company = await Company.findOne({ company_code: 'DEMO' });
    if (!company) {
        company = await Company.create({
            company_code: 'DEMO',
            company_name: 'Demo Company Ltd.',
            primary_currency: 'USD',
            country: 'US',
            email: 'info@demo.com',
            fiscal_year_start: new Date(`${new Date().getFullYear()}-01-01`),
            fiscal_year_end: new Date(`${new Date().getFullYear()}-12-31`),
        });
        console.log('Created company:', company.company_name);
    }

    // Admin role
    let role = await Role.findOne({ company_id: company._id, role_name: 'Admin' });
    if (!role) {
        role = await Role.create({ company_id: company._id, role_name: 'Admin', description: 'Full access' });
        // Grant all permissions
        const modules = ['ar', 'ap', 'sales', 'procurement', 'inventory', 'finance', 'hr', 'payroll'];
        const features = ['invoices', 'orders', 'customers', 'vendors', 'products', 'accounts', 'journals', 'employees', 'payroll'];
        const actions = ['create', 'read', 'update', 'delete', 'post', 'approve'];
        const perms = [];
        for (const m of modules) for (const f of features) for (const a of actions) {
            perms.push({ role_id: role._id, module: m, feature: f, action: a, permission_grant: 'Allow' });
        }
        await RolePermission.insertMany(perms, { ordered: false }).catch(() => {});
        console.log('Created Admin role with permissions');
    }

    // Admin user
    let user = await User.findOne({ email: 'admin@demo.com' });
    if (!user) {
        user = await User.create({
            email: 'admin@demo.com',
            password_hash: 'Admin@123',
            first_name: 'System',
            last_name: 'Admin',
            user_status: 'Active',
        });
        console.log('Created admin user: admin@demo.com / Admin@123');
    }

    // Assign user to company
    await UserCompanyAssignment.findOneAndUpdate(
        { user_id: user._id, company_id: company._id },
        { user_id: user._id, company_id: company._id, role_id: role._id, is_active: true },
        { upsert: true }
    );

    // Chart of Accounts (minimal set for GL posting to work)
    const accounts = [
        { account_number: '1000', account_name: 'Cash', account_type: 'Asset', normal_balance: 'Debit' },
        { account_number: '1100', account_name: 'Bank Account', account_type: 'Asset', normal_balance: 'Debit' },
        { account_number: '1200', account_name: 'Accounts Receivable', account_type: 'Asset', normal_balance: 'Debit' },
        { account_number: '1300', account_name: 'Inventory', account_type: 'Asset', normal_balance: 'Debit' },
        { account_number: '2000', account_name: 'Accounts Payable', account_type: 'Liability', normal_balance: 'Credit' },
        { account_number: '2100', account_name: 'Sales Tax Payable', account_type: 'Liability', normal_balance: 'Credit' },
        { account_number: '3000', account_name: 'Owner Equity', account_type: 'Equity', normal_balance: 'Credit' },
        { account_number: '4000', account_name: 'Sales Revenue', account_type: 'Income', normal_balance: 'Credit' },
        { account_number: '5000', account_name: 'Cost of Goods Sold', account_type: 'Expense', normal_balance: 'Debit' },
        { account_number: '5100', account_name: 'Purchase Expenses', account_type: 'Expense', normal_balance: 'Debit' },
        { account_number: '6000', account_name: 'Salaries Expense', account_type: 'Expense', normal_balance: 'Debit' },
        { account_number: '6100', account_name: 'Operating Expenses', account_type: 'Expense', normal_balance: 'Debit' },
    ];

    for (const acct of accounts) {
        await ChartOfAccounts.findOneAndUpdate(
            { company_id: company._id, account_number: acct.account_number },
            { ...acct, company_id: company._id, allow_posting: true, is_active: true },
            { upsert: true }
        );
    }
    console.log('Chart of Accounts seeded');

    console.log('\n=== Seed Complete ===');
    console.log(`Company ID: ${company._id}`);
    console.log('Login: admin@demo.com / Admin@123');
    console.log('Set REACT_APP_DEFAULT_COMPANY_ID=' + company._id + ' in frontend/.env for auto-select');

    await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
