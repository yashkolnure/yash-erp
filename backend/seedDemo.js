/**
 * seedDemo.js — Full demo data for all ERP modules
 * Run: node seedDemo.js   (from backend/ folder)
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_db';
const d    = (v) => mongoose.Types.Decimal128.fromString(String(parseFloat(v || 0).toFixed(2)));
const ago  = (n) => { const dt = new Date(); dt.setDate(dt.getDate() - n); return dt; };
const fwd  = (n) => { const dt = new Date(); dt.setDate(dt.getDate() + n); return dt; };
const mS   = (offset = 0) => { const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() + offset); dt.setHours(0,0,0,0); return dt; };
const mE   = (offset = 0) => { const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() + offset + 1); dt.setDate(0); dt.setHours(23,59,59,999); return dt; };
const yr   = new Date().getFullYear();
const oid  = () => new mongoose.Types.ObjectId();

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User              = require('./src/models/User');
    const Company           = require('./src/models/Company');
    const Role              = require('./src/models/Role');
    const RolePermission    = require('./src/models/RolePermission');
    const UserCompanyAssignment = require('./src/models/UserCompanyAssignment');
    const ChartOfAccounts   = require('./src/models/ChartOfAccounts');
    const AccountingPeriod  = require('./src/models/AccountingPeriod');
    const ExchangeRate      = require('./src/models/ExchangeRate');
    const BankAccount       = require('./src/models/BankAccount');
    const Warehouse         = require('./src/models/Warehouse');
    const StockBalance      = require('./src/models/StockBalance');
    const StockAdjustment   = require('./src/models/StockAdjustment');
    const StockTransfer     = require('./src/models/StockTransfer');
    const Customer          = require('./src/models/Customer');
    const Vendor            = require('./src/models/Vendor');
    const Product           = require('./src/models/Product');
    const Lead              = require('./src/models/Lead');
    const Quotation         = require('./src/models/Quotation');
    const SalesOrder        = require('./src/models/SalesOrder');
    const Invoice           = require('./src/models/Invoice');
    const CreditNote        = require('./src/models/CreditNote');
    const PurchaseOrder     = require('./src/models/PurchaseOrder');
    const GoodsReceiptNote  = require('./src/models/GoodsReceiptNote');
    const PurchaseInvoice   = require('./src/models/PurchaseInvoice');
    const DebitNote         = require('./src/models/DebitNote');
    const Employee          = require('./src/models/Employee');
    const SalaryStructure   = require('./src/models/SalaryStructure');
    const LeaveRequest      = require('./src/models/LeaveRequest');
    const Timesheet         = require('./src/models/Timesheet');
    const ExpenseClaim      = require('./src/models/ExpenseClaim');
    const Payslip           = require('./src/models/Payslip');
    const Payment           = require('./src/models/Payment');
    const FixedAsset        = require('./src/models/FixedAsset');
    const Budget            = require('./src/models/Budget');
    const JournalEntry      = require('./src/models/JournalEntry');
    const RecurringTemplate = require('./src/models/RecurringTemplate');
    const Message           = require('./src/models/Message');
    const ApprovalRequest   = require('./src/models/ApprovalRequest');

    // ── 1. COMPANY ────────────────────────────────────────────────────────────
    const company = await Company.findOneAndUpdate(
        { company_code: 'DEMO' },
        { company_code: 'DEMO', company_name: 'Avenirya Technologies Ltd.',
          email: 'info@avenirya.com', phone: '+1-555-0100', website: 'https://avenirya.com',
          address: '500 Innovation Drive, Suite 300', city: 'San Francisco',
          state: 'CA', country: 'US', postal_code: '94105',
          tax_id: 'US-TAX-987654321', primary_currency: 'USD',
          supported_currencies: ['USD','EUR','GBP'],
          fiscal_year_start: new Date(`${yr}-01-01`),
          fiscal_year_end:   new Date(`${yr}-12-31`) },
        { upsert: true, new: true }
    );
    const cid = company._id;
    console.log(`✅ Company: ${company.company_name}`);

    // ── 2. ROLES & USERS ──────────────────────────────────────────────────────
    const MODULES = ['Dashboard','Sales','Procurement','Inventory','Finance','HR','Payments','Admin'];
    const ACTIONS = ['view','create','edit','delete','post','approve'];

    const adminRole = await Role.findOneAndUpdate(
        { company_id: cid, role_name: 'Admin' },
        { company_id: cid, role_name: 'Admin', description: 'Full access' },
        { upsert: true, new: true }
    );
    const salesRole = await Role.findOneAndUpdate(
        { company_id: cid, role_name: 'Sales Manager' },
        { company_id: cid, role_name: 'Sales Manager', description: 'Sales & CRM' },
        { upsert: true, new: true }
    );
    const hrRole = await Role.findOneAndUpdate(
        { company_id: cid, role_name: 'HR Officer' },
        { company_id: cid, role_name: 'HR Officer', description: 'HR & Payroll' },
        { upsert: true, new: true }
    );
    for (const m of MODULES) for (const a of ACTIONS) {
        await RolePermission.findOneAndUpdate(
            { role_id: adminRole._id, module: m, action: a },
            { role_id: adminRole._id, module: m, action: a, allowed: true },
            { upsert: true }
        );
    }

    const userDefs = [
        { email: 'admin@demo.com', first: 'Admin',  last: 'User',     role: adminRole._id },
        { email: 'sarah@demo.com', first: 'Sarah',  last: 'Mitchell', role: salesRole._id },
        { email: 'james@demo.com', first: 'James',  last: 'Carter',   role: hrRole._id    },
        { email: 'priya@demo.com', first: 'Priya',  last: 'Sharma',   role: adminRole._id },
    ];
    const users = {};
    for (const ud of userDefs) {
        const u = await User.findOneAndUpdate(
            { email: ud.email },
            { email: ud.email, password_hash: 'Admin@123',
              first_name: ud.first, last_name: ud.last, user_status: 'Active' },
            { upsert: true, new: true }
        );
        await UserCompanyAssignment.findOneAndUpdate(
            { user_id: u._id, company_id: cid },
            { user_id: u._id, company_id: cid, role_id: ud.role, is_active: true },
            { upsert: true }
        );
        users[ud.email] = u;
    }
    const AU = users['admin@demo.com'];
    console.log(`✅ Users & Roles: ${Object.keys(users).join(', ')}`);

    // ── 3. CHART OF ACCOUNTS ──────────────────────────────────────────────────
    const acctDefs = [
        ['1000','Cash on Hand','Asset','Debit'],        ['1100','Main Bank Account','Asset','Debit'],
        ['1110','Petty Cash','Asset','Debit'],           ['1200','Accounts Receivable','Asset','Debit'],
        ['1300','Inventory Asset','Asset','Debit'],      ['1400','Prepaid Expenses','Asset','Debit'],
        ['1500','Fixed Assets','Asset','Debit'],         ['1510','Accum. Depreciation','Asset','Credit'],
        ['2000','Accounts Payable','Liability','Credit'],['2100','Sales Tax Payable','Liability','Credit'],
        ['2200','Accrued Salaries','Liability','Credit'],['2300','Short-term Loans','Liability','Credit'],
        ['3000','Share Capital','Equity','Credit'],      ['3100','Retained Earnings','Equity','Credit'],
        ['4000','Software Sales Revenue','Income','Credit'],['4100','Service Revenue','Income','Credit'],
        ['4200','Consulting Revenue','Income','Credit'], ['4900','Other Income','Income','Credit'],
        ['5000','Cost of Goods Sold','Expense','Debit'],
        ['6000','Salaries Expense','Expense','Debit'],   ['6100','Office Rent','Expense','Debit'],
        ['6200','Software Subscriptions','Expense','Debit'],['6300','Marketing Expense','Expense','Debit'],
        ['6400','Travel & Entertainment','Expense','Debit'],['6500','Depreciation Expense','Expense','Debit'],
        ['6600','Utilities Expense','Expense','Debit'],  ['6700','Bank Charges','Expense','Debit'],
        ['6900','Miscellaneous Expense','Expense','Debit'],
    ];
    const accts = {};
    for (const [num, name, type, normal] of acctDefs) {
        const doc = await ChartOfAccounts.findOneAndUpdate(
            { company_id: cid, account_number: num },
            { company_id: cid, account_number: num, account_name: name,
              account_type: type, normal_balance: normal, allow_posting: true, is_active: true },
            { upsert: true, new: true }
        );
        accts[num] = doc;
    }
    console.log(`✅ Chart of Accounts: ${acctDefs.length} accounts`);

    // ── 4. ACCOUNTING PERIODS ─────────────────────────────────────────────────
    for (const [offset, status] of [[-3,'Closed'],[-2,'Closed'],[-1,'Closed'],[0,'Open'],[1,'Open']]) {
        const ref = mS(offset);
        await AccountingPeriod.findOneAndUpdate(
            { company_id: cid, year: ref.getFullYear(), month: ref.getMonth() + 1 },
            { company_id: cid, year: ref.getFullYear(), month: ref.getMonth() + 1, status },
            { upsert: true }
        );
    }
    console.log('✅ Accounting Periods: 5 (3 closed, 2 open)');

    // ── 5. EXCHANGE RATES ─────────────────────────────────────────────────────
    for (const [from, to, rate] of [['EUR','USD',1.08],['GBP','USD',1.27],['AED','USD',0.272],['INR','USD',0.012]]) {
        await ExchangeRate.findOneAndUpdate(
            { company_id: cid, from_currency: from, to_currency: to },
            { company_id: cid, from_currency: from, to_currency: to,
              rate, effective_date: ago(1), source: 'Manual' },
            { upsert: true }
        );
    }
    console.log('✅ Exchange Rates: EUR, GBP, AED, INR');

    // ── 6. BANK ACCOUNTS ──────────────────────────────────────────────────────
    const bankMain = await BankAccount.findOneAndUpdate(
        { company_id: cid, account_number: '****4521' },
        { company_id: cid, account_name: 'Main Operating Account',
          bank_name: 'First National Bank', account_number: '****4521',
          currency: 'USD', is_default: true, is_active: true },
        { upsert: true, new: true }
    );
    await BankAccount.findOneAndUpdate(
        { company_id: cid, account_number: '****8834' },
        { company_id: cid, account_name: 'EUR Payments Account',
          bank_name: 'European Commerce Bank', account_number: '****8834',
          currency: 'EUR', is_default: false, is_active: true },
        { upsert: true }
    );
    console.log('✅ Bank Accounts: 2');

    // ── 7. WAREHOUSES ─────────────────────────────────────────────────────────
    const whMain = await Warehouse.findOneAndUpdate(
        { company_id: cid, warehouse_code: 'WH-MAIN' },
        { company_id: cid, warehouse_code: 'WH-MAIN', warehouse_name: 'Main Warehouse',
          city: 'San Francisco', state: 'CA', country: 'US', is_active: true },
        { upsert: true, new: true }
    );
    const whEast = await Warehouse.findOneAndUpdate(
        { company_id: cid, warehouse_code: 'WH-EAST' },
        { company_id: cid, warehouse_code: 'WH-EAST', warehouse_name: 'East Coast Depot',
          city: 'New York', state: 'NY', country: 'US', is_active: true },
        { upsert: true, new: true }
    );
    console.log('✅ Warehouses: WH-MAIN, WH-EAST');

    // ── 8. PRODUCTS ───────────────────────────────────────────────────────────
    const pDefs = [
        ['PRD-001','ERP Professional License','Software','Finished Goods',800,1500,5,10],
        ['PRD-002','ERP Enterprise License','Software','Finished Goods',2000,4500,3,8],
        ['PRD-003','Implementation Services','Services','Service',0,3500,0,0],
        ['PRD-004','Annual Support & Maintenance','Services','Service',0,1200,0,0],
        ['PRD-005','Training Workshop (5 days)','Training','Service',0,2500,0,0],
        ['PRD-006','Server Hardware - Dell R740','Hardware','Finished Goods',3200,5800,2,6],
        ['PRD-007','Network Switch - Cisco 24P','Hardware','Finished Goods',450,890,3,15],
        ['PRD-008','USB Security Key (10-pack)','Security','Finished Goods',120,250,10,45],
        ['PRD-009','Cloud Hosting - Annual','Cloud','Service',0,3600,0,0],
        ['PRD-010','Data Migration Package','Services','Service',0,1800,0,0],
    ];
    const prods = {};
    for (const [code,name,cat,type,cost,price,reorder,qty] of pDefs) {
        const doc = await Product.findOneAndUpdate(
            { company_id: cid, product_code: code },
            { company_id: cid, product_code: code, product_name: name, category: cat,
              product_type: type, standard_cost: d(cost), list_price: d(price),
              reorder_level: reorder, reorder_quantity: reorder * 3, is_taxable: true, is_active: true },
            { upsert: true, new: true }
        );
        prods[code] = doc;
        if (qty > 0) {
            await StockBalance.findOneAndUpdate(
                { product_id: doc._id, warehouse_id: whMain._id },
                { product_id: doc._id, warehouse_id: whMain._id,
                  quantity_on_hand: qty, quantity_reserved: 0 },
                { upsert: true }
            );
            await StockBalance.findOneAndUpdate(
                { product_id: doc._id, warehouse_id: whEast._id },
                { product_id: doc._id, warehouse_id: whEast._id,
                  quantity_on_hand: Math.floor(qty/3), quantity_reserved: 0 },
                { upsert: true }
            );
        }
    }
    console.log(`✅ Products: ${pDefs.length} + stock balances`);

    // ── 9. CUSTOMERS ──────────────────────────────────────────────────────────
    const cusDefs = [
        ['CUS-001','Nexus Financial Group','ap@nexusfinancial.com','+1-212-555-0201','New York','US',100000,30],
        ['CUS-002','BlueSky Retail Corp.','finance@bluesky.com','+1-312-555-0303','Chicago','US',75000,45],
        ['CUS-003','Vertex Manufacturing','billing@vertex-mfg.com','+1-713-555-0404','Houston','US',200000,60],
        ['CUS-004','Pacific Logistics Ltd.','accounts@paclog.com','+1-206-555-0505','Seattle','US',50000,30],
        ['CUS-005','EuroTech Solutions GmbH','rechnungen@eurotech.de','+49-89-555-0606','Munich','DE',150000,60],
        ['CUS-006','Meridian Healthcare Inc.','payments@meridianhealth.com','+1-617-555-0707','Boston','US',80000,30],
    ];
    const custs = {};
    for (const [code,name,email,phone,city,country,limit,terms] of cusDefs) {
        const doc = await Customer.findOneAndUpdate(
            { company_id: cid, customer_code: code },
            { company_id: cid, customer_code: code, customer_name: name, email, phone,
              city, country, credit_limit: d(limit), payment_terms_days: terms,
              customer_status: 'Active', is_active: true },
            { upsert: true, new: true }
        );
        custs[code] = doc;
    }
    console.log(`✅ Customers: ${cusDefs.length}`);

    // ── 10. VENDORS ───────────────────────────────────────────────────────────
    const venDefs = [
        ['VEN-001','Dell Technologies Inc.','orders@dell.com','+1-800-624-9896','Round Rock',30],
        ['VEN-002','Microsoft Corporation','billing@microsoft.com','+1-800-642-7676','Redmond',30],
        ['VEN-003','Cisco Systems Inc.','orders@cisco.com','+1-800-553-6387','San Jose',45],
        ['VEN-004','Amazon Web Services','aws-billing@amazon.com','+1-206-266-4064','Seattle',30],
        ['VEN-005','Office Depot Business','business@officedepot.com','+1-800-463-3768','Boca Raton',15],
    ];
    const vends = {};
    for (const [code,name,email,phone,city,terms] of venDefs) {
        const doc = await Vendor.findOneAndUpdate(
            { company_id: cid, vendor_code: code },
            { company_id: cid, vendor_code: code, vendor_name: name, email, phone,
              city, country: 'US', payment_terms_days: terms, vendor_status: 'Active', is_active: true },
            { upsert: true, new: true }
        );
        vends[code] = doc;
    }
    console.log(`✅ Vendors: ${venDefs.length}`);

    // ── 11. CRM LEADS ─────────────────────────────────────────────────────────
    await Lead.deleteMany({ company_id: cid });
    const leadDefs = [
        ['LEAD-001','Michael Torres','Apex Capital LLC','New',10,45000,10],
        ['LEAD-002','Linda Chen','SunBridge Hotels','Contacted',25,120000,25],
        ['LEAD-003','Robert Singh','GreenLeaf Agriculture','Qualified',50,85000,50],
        ['LEAD-004','Amanda Foster','Stellar Insurance Group','Proposal',65,210000,65],
        ['LEAD-005','Kevin Park','NovaTech Pharma','Negotiation',80,175000,80],
        ['LEAD-006','Sara Johnson','Premier Auto Group','Won',100,95000,100],
        ['LEAD-007','David Wilson','MidWest Distributors','Lost',0,55000,0],
        ['LEAD-008','Fatima Al-Hassan','Dubai Trade Partners','Qualified',45,320000,45],
    ];
    for (const [num,contact,company_name,stage,prob,value,daysOld] of leadDefs) {
        await Lead.create({
            company_id: cid, lead_number: num, contact_name: contact, company_name,
            email: `${contact.split(' ')[0].toLowerCase()}@${company_name.replace(/\s+/g,'').toLowerCase()}.com`,
            phone: `+1-555-${9000+leadDefs.findIndex(l=>l[0]===num)}`,
            stage, source: ['Website','Referral','Trade Show','Cold Call','Social Media'][Math.floor(prob/25)%5],
            estimated_value: d(value), probability: prob, currency: 'USD',
            expected_close_date: fwd(30 - Math.floor(daysOld/3)),
            description: `Interested in ERP solution for their operations.`,
            lost_reason: stage === 'Lost' ? 'Selected a competitor product.' : undefined,
            assigned_to: users['sarah@demo.com']._id, created_by: AU._id,
            activities: [
                { type: 'Call', description: 'Initial discovery call', date: ago(Math.floor(daysOld/3)), outcome: 'Positive interest', user_id: users['sarah@demo.com']._id },
                ...(prob >= 50 ? [{ type: 'Email', description: 'Sent product brochure', date: ago(Math.floor(daysOld/4)), outcome: 'Awaiting response', user_id: users['sarah@demo.com']._id }] : []),
                ...(prob >= 65 ? [{ type: 'Meeting', description: 'Product demo to stakeholders', date: ago(Math.floor(daysOld/5)), outcome: 'Very positive', user_id: users['sarah@demo.com']._id }] : []),
            ],
        });
    }
    console.log(`✅ CRM Leads: ${leadDefs.length}`);

    // helper: build line items from product defs
    const makeLines = (defs) => defs.map(([pcode, qty, costOverride]) => {
        const p   = prods[pcode];
        const prc = costOverride || parseFloat(p.list_price.toString());
        return { product_id: p._id, description: p.product_name, quantity: qty,
                 unit_price: d(prc), tax_rate: d(10), line_total: d(prc * qty) };
    });
    const totals = (lines) => {
        const sub = lines.reduce((s,l) => s + parseFloat(l.line_total.toString()), 0);
        const tax = sub * 0.10;
        return { subtotal: d(sub), tax_amount: d(tax), total_amount: d(sub + tax) };
    };

    // ── 12. QUOTATIONS ────────────────────────────────────────────────────────
    await Quotation.deleteMany({ company_id: cid });
    const quoteSpecs = [
        ['QUO-2025-001','CUS-001','Accepted',45, [['PRD-001',5],['PRD-003',1]]],
        ['QUO-2025-002','CUS-002','Sent',    15, [['PRD-002',2],['PRD-004',2]]],
        ['QUO-2025-003','CUS-003','Draft',    5, [['PRD-006',3],['PRD-007',5]]],
        ['QUO-2025-004','CUS-005','Rejected', 30,[['PRD-001',10]]],
        ['QUO-2025-005','CUS-004','Accepted', 20,[['PRD-009',1],['PRD-005',1]]],
    ];
    for (const [num,cust,status,daysOld,lines] of quoteSpecs) {
        const li = makeLines(lines); const t = totals(li);
        await Quotation.create({
            company_id: cid, quotation_number: num, customer_id: custs[cust]._id,
            quotation_date: ago(daysOld), expiry_date: fwd(30 - daysOld),
            status, line_items: li, ...t, currency: 'USD',
            notes: 'Prices valid for 30 days. Delivery within 2 weeks of confirmed order.',
            assigned_to: users['sarah@demo.com']._id, created_by: AU._id,
        });
    }
    console.log('✅ Quotations: 5');

    // ── 13. SALES ORDERS ──────────────────────────────────────────────────────
    await SalesOrder.deleteMany({ company_id: cid });
    const soSpecs = [
        ['SO-2025-001','CUS-001','Invoiced',  40,[['PRD-001',5],['PRD-003',1]]],
        ['SO-2025-002','CUS-002','Confirmed', 10,[['PRD-002',2],['PRD-004',2]]],
        ['SO-2025-003','CUS-004','Confirmed', 18,[['PRD-009',1],['PRD-005',1]]],
        ['SO-2025-004','CUS-006','Draft',      3,[['PRD-001',3],['PRD-010',1]]],
        ['SO-2025-005','CUS-003','Confirmed', 25,[['PRD-006',2],['PRD-007',4]]],
    ];
    const sOs = {};
    for (const [num,cust,status,daysOld,lines] of soSpecs) {
        const li = makeLines(lines); const t = totals(li);
        const doc = await SalesOrder.create({
            company_id: cid, order_number: num, customer_id: custs[cust]._id,
            order_date: ago(daysOld), required_date: fwd(14 - daysOld),
            status, line_items: li, ...t, currency: 'USD',
            notes: 'Standard payment terms apply.',
            assigned_to: users['sarah@demo.com']._id, created_by: AU._id,
        });
        sOs[num] = doc;
    }
    console.log('✅ Sales Orders: 5');

    // ── 14. AR INVOICES ───────────────────────────────────────────────────────
    await Invoice.deleteMany({ company_id: cid });
    const invSpecs = [
        ['INV-2025-001','CUS-001','Paid',          38,-22,[['PRD-001',5],['PRD-003',1]], true ],
        ['INV-2025-002','CUS-002','Posted',         20, 10,[['PRD-004',2]],               false],
        ['INV-2025-003','CUS-003','Overdue',        65,-35,[['PRD-006',1],['PRD-007',3]], false],
        ['INV-2025-004','CUS-004','Partially Paid', 30,  0,[['PRD-009',1],['PRD-005',1]], false,3000],
        ['INV-2025-005','CUS-005','Posted',          8, 52,[['PRD-002',2],['PRD-010',1]], false],
        ['INV-2025-006','CUS-006','Draft',           2, 28,[['PRD-001',3]],               false],
        ['INV-2025-007','CUS-001','Paid',           90,-60,[['PRD-002',1]],               true ],
        ['INV-2025-008','CUS-006','Posted',         14, 16,[['PRD-003',1],['PRD-010',1]], false],
    ];
    for (const [num,cust,status,daysOld,dueDays,lines,fullPaid,partialPaid] of invSpecs) {
        const li = makeLines(lines); const t = totals(li);
        const totalAmt = parseFloat(t.total_amount.toString());
        const paid = fullPaid ? totalAmt : (partialPaid || 0);
        await Invoice.create({
            company_id: cid, invoice_number: num, customer_id: custs[cust]._id,
            invoice_date: ago(daysOld), due_date: fwd(dueDays),
            status, line_items: li, ...t,
            amount_paid: d(paid), amount_due: d(totalAmt - paid),
            currency: 'USD', notes: 'Payment due as per agreed terms.',
            created_by: AU._id,
            posted_by: status !== 'Draft' ? AU._id : undefined,
            posted_at: status !== 'Draft' ? ago(daysOld - 1) : undefined,
        });
    }
    console.log('✅ AR Invoices: 8');

    // ── 15. CREDIT NOTES ──────────────────────────────────────────────────────
    await CreditNote.deleteMany({ company_id: cid });
    await CreditNote.create({
        company_id: cid, credit_note_number: 'CN-2025-001',
        customer_id: custs['CUS-003']._id, credit_note_date: ago(20), status: 'Posted',
        reason: 'Customer returned one faulty Cisco switch unit.',
        line_items: [{ description: 'Return: Network Switch - Cisco 24P (faulty)', quantity: 1, unit_price: d(890), tax_rate: d(10), line_total: d(890) }],
        subtotal: d(890), tax_amount: d(89), total_amount: d(979),
        amount_applied: d(0), amount_remaining: d(979), currency: 'USD',
        created_by: AU._id, posted_by: AU._id, posted_at: ago(19),
    });
    await CreditNote.create({
        company_id: cid, credit_note_number: 'CN-2025-002',
        customer_id: custs['CUS-001']._id, credit_note_date: ago(10), status: 'Draft',
        reason: 'Partial credit: project scope reduction by mutual agreement.',
        line_items: [{ description: 'Partial credit: Implementation services', quantity: 1, unit_price: d(1000), tax_rate: d(10), line_total: d(1000) }],
        subtotal: d(1000), tax_amount: d(100), total_amount: d(1100),
        amount_applied: d(0), amount_remaining: d(1100), currency: 'USD',
        created_by: AU._id,
    });
    console.log('✅ Credit Notes: 2');

    // ── 16. PURCHASE ORDERS ───────────────────────────────────────────────────
    await PurchaseOrder.deleteMany({ company_id: cid });
    const poSpecs = [
        ['PO-2025-001','VEN-001','Received Complete',35,[['PRD-006',3,3200],['PRD-007',5,450]]],
        ['PO-2025-002','VEN-002','Invoiced',         28,[['PRD-001',10,800]]],
        ['PO-2025-003','VEN-003','Confirmed',         10,[['PRD-007',10,450]]],
        ['PO-2025-004','VEN-004','Draft',              2,[['PRD-009',1,2400]]],
        ['PO-2025-005','VEN-005','Confirmed',          7,[['PRD-008',5,120]]],
    ];
    const pos = {};
    for (const [num,ven,status,daysOld,lines] of poSpecs) {
        const li = lines.map(([pcode,qty,cost]) => ({
            product_id: prods[pcode]._id, description: prods[pcode].product_name,
            quantity_ordered: qty, quantity_received: status.startsWith('Received') || status === 'Invoiced' ? qty : 0,
            unit_price: d(cost), tax_rate: d(8), line_total: d(cost * qty),
        }));
        const sub = li.reduce((s,l) => s + parseFloat(l.line_total.toString()), 0);
        const tax = sub * 0.08;
        const doc = await PurchaseOrder.create({
            company_id: cid, po_number: num, vendor_id: vends[ven]._id,
            po_date: ago(daysOld), required_date: fwd(14 - daysOld),
            status, line_items: li, subtotal: d(sub), tax_amount: d(tax), total_amount: d(sub + tax),
            currency: 'USD', notes: 'Confirm delivery within 24h of arrival.', created_by: AU._id,
        });
        pos[num] = doc;
    }
    console.log('✅ Purchase Orders: 5');

    // ── 17. GRNs ──────────────────────────────────────────────────────────────
    await GoodsReceiptNote.deleteMany({ company_id: cid });
    await GoodsReceiptNote.create({
        company_id: cid, grn_number: 'GRN-2025-001',
        purchase_order_id: pos['PO-2025-001']._id, vendor_id: vends['VEN-001']._id,
        receipt_date: ago(30), warehouse_id: whMain._id, status: 'Accepted',
        line_items: [
            { product_id: prods['PRD-006']._id, quantity_received: 3, quantity_accepted: 3, quantity_rejected: 0 },
            { product_id: prods['PRD-007']._id, quantity_received: 5, quantity_accepted: 5, quantity_rejected: 0 },
        ],
        notes: 'All items received in good condition.', created_by: AU._id,
    });
    await GoodsReceiptNote.create({
        company_id: cid, grn_number: 'GRN-2025-002',
        purchase_order_id: pos['PO-2025-002']._id, vendor_id: vends['VEN-002']._id,
        receipt_date: ago(22), warehouse_id: whMain._id, status: 'Accepted',
        line_items: [
            { product_id: prods['PRD-001']._id, quantity_received: 10, quantity_accepted: 10, quantity_rejected: 0 },
        ],
        notes: 'Licenses delivered digitally and confirmed.', created_by: AU._id,
    });
    await GoodsReceiptNote.create({
        company_id: cid, grn_number: 'GRN-2025-003',
        purchase_order_id: pos['PO-2025-005']._id, vendor_id: vends['VEN-005']._id,
        receipt_date: ago(4), warehouse_id: whMain._id, status: 'Received',
        line_items: [
            { product_id: prods['PRD-008']._id, quantity_received: 5, quantity_accepted: 5, quantity_rejected: 0 },
        ],
        notes: 'Pending full QC inspection.', created_by: AU._id,
    });
    console.log('✅ GRNs: 3');

    // ── 18. PURCHASE BILLS ────────────────────────────────────────────────────
    await PurchaseInvoice.deleteMany({ company_id: cid });
    const billSpecs = [
        ['BILL-2025-001','VEN-001','PO-2025-001','Paid',   28,-10,[['PRD-006',3,3200],['PRD-007',5,450]]],
        ['BILL-2025-002','VEN-002','PO-2025-002','Posted',  20, 10,[['PRD-001',10,800]]],
        ['BILL-2025-003','VEN-004',null,          'Posted',  15, 15,[['PRD-009',1,2400]]],
        ['BILL-2025-004','VEN-005','PO-2025-005', 'Draft',   3, 27,[['PRD-008',5,120]]],
    ];
    for (const [num,ven,po,status,daysOld,dueDays,lines] of billSpecs) {
        const li = lines.map(([pcode,qty,cost]) => ({
            product_id: prods[pcode]._id, description: prods[pcode].product_name,
            quantity: qty, unit_price: d(cost), tax_rate: d(8), line_total: d(cost * qty),
        }));
        const sub = li.reduce((s,l) => s + parseFloat(l.line_total.toString()), 0);
        const tax = sub * 0.08; const total = sub + tax;
        const paid = status === 'Paid' ? total : 0;
        await PurchaseInvoice.create({
            company_id: cid, invoice_number: num, vendor_id: vends[ven]._id,
            purchase_order_id: po ? pos[po]._id : undefined,
            invoice_date: ago(daysOld), due_date: fwd(dueDays),
            status, line_items: li, subtotal: d(sub), tax_amount: d(tax),
            total_amount: d(total), amount_paid: d(paid), amount_due: d(total - paid),
            currency: 'USD', notes: 'Match against PO before payment.', created_by: AU._id,
            posted_by: status !== 'Draft' ? AU._id : undefined,
            posted_at: status !== 'Draft' ? ago(daysOld - 1) : undefined,
        });
    }
    console.log('✅ Purchase Bills: 4');

    // ── 19. DEBIT NOTE ────────────────────────────────────────────────────────
    await DebitNote.deleteMany({ company_id: cid });
    await DebitNote.create({
        company_id: cid, debit_note_number: 'DN-2025-001', vendor_id: vends['VEN-001']._id,
        debit_note_date: ago(25), status: 'Posted',
        reason: 'One Dell R740 server arrived dead-on-arrival — returned for replacement.',
        line_items: [{ description: 'Return: Server Hardware - Dell R740 (DOA)', quantity: 1, unit_price: d(3200), tax_rate: d(8), line_total: d(3200) }],
        subtotal: d(3200), tax_amount: d(256), total_amount: d(3456),
        amount_applied: d(0), amount_remaining: d(3456), currency: 'USD',
        created_by: AU._id, posted_by: AU._id, posted_at: ago(24),
    });
    console.log('✅ Debit Notes: 1');

    // ── 20. SALARY STRUCTURES ─────────────────────────────────────────────────
    await SalaryStructure.deleteMany({ company_id: cid });
    const ssA = await SalaryStructure.create({
        company_id: cid, name: 'Senior Staff — Grade A',
        description: 'For senior engineers and managers', is_active: true, created_by: AU._id,
        components: [
            { name:'Basic Salary',         type:'Earning',   calc_type:'Fixed',               value:d(6000),  is_taxable:true,  order:1 },
            { name:'Housing Allowance',    type:'Earning',   calc_type:'Percentage of Basic',  value:d(20),    is_taxable:false, order:2 },
            { name:'Transport Allowance',  type:'Earning',   calc_type:'Fixed',               value:d(300),   is_taxable:false, order:3 },
            { name:'Performance Bonus',    type:'Earning',   calc_type:'Fixed',               value:d(500),   is_taxable:true,  order:4 },
            { name:'Federal Income Tax',   type:'Deduction', calc_type:'Percentage of Gross',  value:d(22),    is_taxable:false, order:5 },
            { name:'Social Security',      type:'Deduction', calc_type:'Percentage of Basic',  value:d(6.2),   is_taxable:false, order:6 },
            { name:'Medicare',             type:'Deduction', calc_type:'Percentage of Basic',  value:d(1.45),  is_taxable:false, order:7 },
            { name:"401(k) Contribution",  type:'Deduction', calc_type:'Percentage of Basic',  value:d(5),     is_taxable:false, order:8 },
            { name:'Health Insurance',     type:'Deduction', calc_type:'Fixed',               value:d(250),   is_taxable:false, order:9 },
        ],
    });
    const ssB = await SalaryStructure.create({
        company_id: cid, name: 'Junior Staff — Grade B',
        description: 'For entry-level and mid-level staff', is_active: true, created_by: AU._id,
        components: [
            { name:'Basic Salary',        type:'Earning',   calc_type:'Fixed',               value:d(3500), is_taxable:true,  order:1 },
            { name:'Housing Allowance',   type:'Earning',   calc_type:'Percentage of Basic',  value:d(15),   is_taxable:false, order:2 },
            { name:'Transport Allowance', type:'Earning',   calc_type:'Fixed',               value:d(200),  is_taxable:false, order:3 },
            { name:'Federal Income Tax',  type:'Deduction', calc_type:'Percentage of Gross',  value:d(15),   is_taxable:false, order:4 },
            { name:'Social Security',     type:'Deduction', calc_type:'Percentage of Basic',  value:d(6.2),  is_taxable:false, order:5 },
            { name:'Medicare',            type:'Deduction', calc_type:'Percentage of Basic',  value:d(1.45), is_taxable:false, order:6 },
            { name:'Health Insurance',    type:'Deduction', calc_type:'Fixed',               value:d(150),  is_taxable:false, order:7 },
        ],
    });
    console.log('✅ Salary Structures: 2');

    // ── 21. EMPLOYEES ─────────────────────────────────────────────────────────
    await Employee.deleteMany({ company_id: cid });
    const empDefs = [
        ['EMP-001','Sarah','Mitchell','sarah@demo.com','Sales','Sales Director','Full-time',8000,730,ssA._id],
        ['EMP-002','James','Carter',  'james@demo.com','HR','HR Manager','Full-time',6500,500,ssA._id],
        ['EMP-003','Priya','Sharma',  'priya@demo.com','Finance','Chief Financial Officer','Full-time',9500,900,ssA._id],
        ['EMP-004','Daniel','Nguyen', 'daniel@demo.com','Engineering','Senior Developer','Full-time',7000,400,ssA._id],
        ['EMP-005','Emily','Watson',  'emily@demo.com','Marketing','Marketing Specialist','Full-time',4200,200,ssB._id],
        ['EMP-006','Carlos','Mendez', 'carlos@demo.com','Support','Customer Support Engineer','Full-time',3800,120,ssB._id],
    ];
    const emps = {};
    for (const [code,first,last,email,dept,title,type,salary,days,ssId] of empDefs) {
        const uMatch = Object.values(users).find(u => u.email === email);
        const doc = await Employee.create({
            company_id: cid, employee_code: code, first_name: first, last_name: last,
            email, phone: `+1-555-${1000+empDefs.findIndex(e=>e[0]===code)}`,
            department: dept, job_title: title, date_of_joining: ago(days),
            date_of_birth: ago(365*30 + empDefs.findIndex(e=>e[0]===code)*200),
            employment_type: type, employment_status: 'Active',
            salary: d(salary), basic_salary: d(salary), currency: 'USD',
            bank_account: `****${5000+empDefs.findIndex(e=>e[0]===code)}`,
            salary_structure_id: ssId, is_active: true,
            user_id: uMatch ? uMatch._id : undefined,
        });
        emps[code] = doc;
    }
    console.log(`✅ Employees: ${empDefs.length}`);

    // ── 22. LEAVE REQUESTS ────────────────────────────────────────────────────
    await LeaveRequest.deleteMany({ company_id: cid });
    const leaveDefs = [
        [emps['EMP-005']._id,'Annual',ago(30),ago(26),5,'Approved','Family vacation'],
        [emps['EMP-006']._id,'Sick',  ago(10),ago(9), 2,'Approved','Doctor appointment'],
        [emps['EMP-004']._id,'Annual',fwd(5), fwd(9), 5,'Pending', 'Personal travel'],
        [emps['EMP-002']._id,'Unpaid',ago(50),ago(47),4,'Rejected','Extended personal leave'],
        [emps['EMP-001']._id,'Annual',fwd(20),fwd(24),5,'Pending', 'Annual leave — booked in advance'],
    ];
    for (const [empId,type,start,end,days,status,reason] of leaveDefs) {
        await LeaveRequest.create({
            company_id: cid, employee_id: empId, leave_type: type,
            start_date: start, end_date: end, days, reason, status,
            approved_by: status === 'Approved' ? users['james@demo.com']._id : undefined,
            approved_at: status === 'Approved' ? ago(Math.floor(Math.random()*5)+1) : undefined,
            rejection_reason: status === 'Rejected' ? 'Operational requirements do not permit this leave.' : undefined,
            created_by: AU._id,
        });
    }
    console.log('✅ Leave Requests: 5');

    // ── 23. TIMESHEETS ────────────────────────────────────────────────────────
    await Timesheet.deleteMany({ company_id: cid });
    const w1 = (() => { const d = ago(14); d.setDate(d.getDate() - (d.getDay()||7) + 1); return d; })();
    const w2 = (() => { const d = ago(7);  d.setDate(d.getDate() - (d.getDay()||7) + 1); return d; })();
    const wkEnd = (wk) => new Date(wk.getTime() + 4 * 86400000);
    const mkEntries = (wk, hrs, proj) => hrs.map((h,i) => ({
        date: new Date(new Date(wk).setDate(wk.getDate()+i)), hours: h, project: proj, description: 'Development'
    })).filter(e=>e.hours>0);

    await Timesheet.create({ company_id: cid, employee_id: emps['EMP-004']._id, week_start: w1, week_end: wkEnd(w1), status: 'Approved', entries: mkEntries(w1,[8,8,7.5,8,6],'Nexus Financial ERP Setup'), total_hours: 37.5, created_by: AU._id });
    await Timesheet.create({ company_id: cid, employee_id: emps['EMP-004']._id, week_start: w2, week_end: wkEnd(w2), status: 'Submitted', entries: mkEntries(w2,[8,8,8,7,8],'Nexus Financial ERP Setup'), total_hours: 39, created_by: AU._id });
    await Timesheet.create({ company_id: cid, employee_id: emps['EMP-001']._id, week_start: w1, week_end: wkEnd(w1), status: 'Approved', entries: mkEntries(w1,[6,7,8,7,5],'Sales — CUS-003 Account'), total_hours: 33, created_by: AU._id });
    await Timesheet.create({ company_id: cid, employee_id: emps['EMP-005']._id, week_start: w2, week_end: wkEnd(w2), status: 'Draft', entries: mkEntries(w2,[8,7.5,8,0,8],'Q3 Marketing Campaign'), total_hours: 31.5, created_by: AU._id });
    console.log('✅ Timesheets: 4');

    // ── 24. EXPENSE CLAIMS ────────────────────────────────────────────────────
    await ExpenseClaim.deleteMany({ company_id: cid });
    await ExpenseClaim.create({
        company_id: cid, claim_number: 'EXP-2025-001',
        employee_id: emps['EMP-001']._id, status: 'Paid', currency: 'USD',
        lines: [
            { date: ago(25), category: 'Travel',  description: 'Round-trip flight SF→NYC (CUS-003 visit)', amount: d(480) },
            { date: ago(24), category: 'Hotel',   description: '2 nights at Marriott Times Square', amount: d(380) },
            { date: ago(23), category: 'Meals',   description: 'Client dinner — Nexus Financial team', amount: d(145) },
        ],
        total_amount: d(1005),
        approved_by: users['james@demo.com']._id, approved_at: ago(20), paid_at: ago(15),
        created_by: AU._id,
    });
    await ExpenseClaim.create({
        company_id: cid, claim_number: 'EXP-2025-002',
        employee_id: emps['EMP-004']._id, status: 'Approved', currency: 'USD',
        lines: [
            { date: ago(8), category: 'Software', description: 'Postman Pro subscription (annual)', amount: d(144) },
            { date: ago(8), category: 'Software', description: 'GitHub Copilot (annual)', amount: d(100) },
            { date: ago(6), category: 'Training', description: 'AWS Solutions Architect course', amount: d(299) },
        ],
        total_amount: d(543),
        approved_by: users['james@demo.com']._id, approved_at: ago(5),
        created_by: AU._id,
    });
    await ExpenseClaim.create({
        company_id: cid, claim_number: 'EXP-2025-003',
        employee_id: emps['EMP-005']._id, status: 'Submitted', currency: 'USD',
        lines: [
            { date: ago(3), category: 'Marketing', description: 'LinkedIn Ads campaign — October', amount: d(500) },
            { date: ago(3), category: 'Marketing', description: 'Canva Pro subscription', amount: d(13) },
        ],
        total_amount: d(513), created_by: AU._id,
    });
    console.log('✅ Expense Claims: 3');

    // ── 25. PAYSLIPS ──────────────────────────────────────────────────────────
    await Payslip.deleteMany({ company_id: cid });
    const psDefs = [
        ['PAY-2025-001',emps['EMP-001']._id,6000,[{label:'Housing Allowance',amt:1200},{label:'Transport',amt:300},{label:'Performance Bonus',amt:500}],[{label:'Federal Tax',amt:1540},{label:'Social Security',amt:372},{label:'Medicare',amt:87},{label:"401k",amt:300},{label:'Health Insurance',amt:250}],'Paid',-2],
        ['PAY-2025-002',emps['EMP-003']._id,9500,[{label:'Housing Allowance',amt:1900},{label:'Transport',amt:300},{label:'Performance Bonus',amt:500}],[{label:'Federal Tax',amt:2684},{label:'Social Security',amt:589},{label:'Medicare',amt:138},{label:"401k",amt:475},{label:'Health Insurance',amt:250}],'Paid',-2],
        ['PAY-2025-003',emps['EMP-004']._id,7000,[{label:'Housing Allowance',amt:1400},{label:'Transport',amt:300},{label:'Performance Bonus',amt:500}],[{label:'Federal Tax',amt:1980},{label:'Social Security',amt:434},{label:'Medicare',amt:102},{label:"401k",amt:350},{label:'Health Insurance',amt:250}],'Approved',-1],
        ['PAY-2025-004',emps['EMP-005']._id,4200,[{label:'Housing Allowance',amt:630},{label:'Transport',amt:200}],[{label:'Federal Tax',amt:732},{label:'Social Security',amt:260},{label:'Medicare',amt:61},{label:'Health Insurance',amt:150}],'Draft',0],
        ['PAY-2025-005',emps['EMP-006']._id,3800,[{label:'Housing Allowance',amt:570},{label:'Transport',amt:200}],[{label:'Federal Tax',amt:645},{label:'Social Security',amt:236},{label:'Medicare',amt:55},{label:'Health Insurance',amt:150}],'Draft',0],
    ];
    for (const [num,empId,basic,earn,deduct,status,offset] of psDefs) {
        const gross = basic + earn.reduce((s,e)=>s+e.amt,0);
        const totalDed = deduct.reduce((s,d)=>s+d.amt,0);
        const net = gross - totalDed;
        await Payslip.create({
            company_id: cid, employee_id: empId, payslip_number: num,
            period_start: mS(offset-1), period_end: mE(offset-1),
            pay_date: status==='Paid' ? mE(offset-1) : undefined, status,
            basic_salary: d(basic),
            earnings: earn.map(e=>({label:e.label, amount:d(e.amt)})),
            gross_salary: d(gross),
            deductions: deduct.map(e=>({label:e.label, amount:d(e.amt)})),
            total_deductions: d(totalDed), net_salary: d(net),
            currency: 'USD', working_days: 22, present_days: 22, absent_days: 0,
            created_by: AU._id,
        });
    }
    console.log('✅ Payslips: 5');

    // ── 26. PAYMENTS ──────────────────────────────────────────────────────────
    await Payment.deleteMany({ company_id: cid });
    const pmtDefs = [
        ['PMT-2025-001','Customer Payment',custs['CUS-001']._id,'Customer',10250,ago(25),'Bank Transfer','Wire-REF-88921','Full payment for INV-2025-001'],
        ['PMT-2025-002','Customer Payment',custs['CUS-004']._id,'Customer',3000, ago(12),'Bank Transfer','Wire-REF-90115','Partial payment for INV-2025-004'],
        ['PMT-2025-003','Vendor Payment',  vends['VEN-001']._id,'Vendor',  11772,ago(18),'Bank Transfer','Wire-REF-89440','Payment for BILL-2025-001'],
        ['PMT-2025-004','Customer Payment',custs['CUS-001']._id,'Customer',4950, ago(60),'Check',        'CHQ-44120',     'Full payment for INV-2025-007'],
    ];
    for (const [num,type,partyId,partyModel,amount,date,method,ref,notes] of pmtDefs) {
        await Payment.create({
            company_id: cid, payment_type: type,
            party_id: partyId, party_model: partyModel,
            payment_date: date, payment_method: method,
            amount: d(amount), currency: 'USD',
            reference_number: ref, bank_account: '****4521',
            notes, created_by: AU._id,
        });
    }
    console.log('✅ Payments: 4');

    // ── 27. FIXED ASSETS ──────────────────────────────────────────────────────
    await FixedAsset.deleteMany({ company_id: cid });
    const faDefs = [
        ['AST-001','Dell PowerEdge R740 Server','Computer',  12000,500, 5,3600, 'Active'],
        ['AST-002','Office Furniture — HQ Floor 3','Furniture',8500,500, 10,1700,'Active'],
        ['AST-003','Company Vehicle — Tesla Model Y','Vehicle',55000,10000,7,12857,'Active'],
        ['AST-004','Cisco Network Infrastructure','Computer',22000,1000,7,21000,'Fully Depreciated'],
        ['AST-005','MacBook Pro Fleet (10 units)','Computer', 30000,3000,4,6750, 'Active'],
    ];
    for (const [code,name,cat,cost,salvage,life,dep,status] of faDefs) {
        await FixedAsset.create({
            company_id: cid, asset_code: code, asset_name: name, category: cat,
            purchase_date: ago(365 + faDefs.findIndex(f=>f[0]===code)*60),
            purchase_cost: d(cost), salvage_value: d(salvage),
            useful_life_years: life, depreciation_method: 'Straight Line',
            accumulated_depreciation: d(dep), net_book_value: d(cost - dep),
            location: 'San Francisco HQ', status, created_by: AU._id,
        });
    }
    console.log('✅ Fixed Assets: 5');

    // ── 28. BUDGET ────────────────────────────────────────────────────────────
    await Budget.deleteMany({ company_id: cid });
    await Budget.create({
        company_id: cid, name: `FY${yr} Operating Budget`, fiscal_year: yr, status: 'Active',
        notes: `Annual operating budget FY${yr}. Approved by CFO.`,
        lines: [
            { account_id: accts['4000']._id, account_name: 'Software Sales Revenue', jan:d(120000),feb:d(125000),mar:d(130000),apr:d(140000),may:d(145000),jun:d(150000),jul:d(155000),aug:d(160000),sep:d(165000),oct:d(170000),nov:d(175000),dec:d(200000),total:d(1835000) },
            { account_id: accts['4100']._id, account_name: 'Service Revenue',         jan:d(80000), feb:d(82000), mar:d(85000), apr:d(90000), may:d(92000), jun:d(95000), jul:d(98000), aug:d(100000),sep:d(102000),oct:d(105000),nov:d(108000),dec:d(120000),total:d(1157000) },
            { account_id: accts['6000']._id, account_name: 'Salaries Expense',        jan:d(55000), feb:d(55000), mar:d(55000), apr:d(58000), may:d(58000), jun:d(58000), jul:d(60000), aug:d(60000), sep:d(60000), oct:d(62000), nov:d(62000), dec:d(65000), total:d(708000)  },
            { account_id: accts['6100']._id, account_name: 'Office Rent',             jan:d(15000), feb:d(15000), mar:d(15000), apr:d(15000), may:d(15000), jun:d(15000), jul:d(15000), aug:d(15000), sep:d(15000), oct:d(15000), nov:d(15000), dec:d(15000), total:d(180000)  },
            { account_id: accts['6300']._id, account_name: 'Marketing Expense',       jan:d(12000), feb:d(12000), mar:d(15000), apr:d(12000), may:d(12000), jun:d(15000), jul:d(12000), aug:d(12000), sep:d(15000), oct:d(12000), nov:d(12000), dec:d(20000), total:d(161000)  },
        ],
        created_by: AU._id,
    });
    console.log('✅ Budget: 1 annual active');

    // ── 29. JOURNAL ENTRIES ───────────────────────────────────────────────────
    await JournalEntry.deleteMany({ company_id: cid });
    await JournalEntry.create({
        company_id: cid, journal_date: ago(60), reference_number: 'JRN-2025-001',
        description: 'Opening equity injection at company formation',
        status: 'Posted',
        lines: [
            { account_id: accts['1100']._id, debit_amount: d(250000), credit_amount: d(0), description: 'Initial bank funding' },
            { account_id: accts['3000']._id, debit_amount: d(0), credit_amount: d(250000), description: 'Share capital — founders' },
        ],
        posted_by: AU._id, posted_at: ago(60), created_by: AU._id,
    });
    await JournalEntry.create({
        company_id: cid, journal_date: ago(30), reference_number: 'JRN-2025-002',
        description: 'Monthly office rent — San Francisco HQ, October 2025',
        status: 'Posted',
        lines: [
            { account_id: accts['6100']._id, debit_amount: d(15000), credit_amount: d(0),    description: 'October rent' },
            { account_id: accts['1100']._id, debit_amount: d(0),     credit_amount: d(15000), description: 'Bank payment' },
        ],
        posted_by: AU._id, posted_at: ago(30), created_by: AU._id,
    });
    await JournalEntry.create({
        company_id: cid, journal_date: ago(5), reference_number: 'JRN-2025-003',
        description: 'AWS cloud hosting — November 2025 accrual',
        status: 'Draft',
        lines: [
            { account_id: accts['6200']._id, debit_amount: d(4800), credit_amount: d(0),   description: 'AWS November invoice' },
            { account_id: accts['2000']._id, debit_amount: d(0),    credit_amount: d(4800), description: 'Accrued payable' },
        ],
        created_by: AU._id,
    });
    console.log('✅ Journal Entries: 3 (2 posted, 1 draft)');

    // ── 30. STOCK ADJUSTMENTS ─────────────────────────────────────────────────
    await StockAdjustment.deleteMany({ company_id: cid });
    await StockAdjustment.create({
        company_id: cid, adjustment_number: 'ADJ-2025-001',
        adjustment_date: ago(20), adjustment_type: 'Damage', status: 'Posted',
        notes: 'Q3 Stocktake — 2 units water-damaged in storage area B.',
        lines: [{ product_id: prods['PRD-007']._id, warehouse_id: whMain._id, adjustment_type: 'Remove', quantity: 2, unit_cost: d(450), reason: 'Water damage during storage' }],
        created_by: AU._id, posted_by: AU._id, posted_at: ago(19),
    });
    await StockAdjustment.create({
        company_id: cid, adjustment_number: 'ADJ-2025-002',
        adjustment_date: ago(5), adjustment_type: 'Write-Up', status: 'Draft',
        notes: 'Initial stock setup for East Coast Depot.',
        lines: [
            { product_id: prods['PRD-008']._id, warehouse_id: whEast._id, adjustment_type: 'Add', quantity: 20, unit_cost: d(120), reason: 'Direct supplier shipment to depot' },
            { product_id: prods['PRD-006']._id, warehouse_id: whEast._id, adjustment_type: 'Add', quantity: 2,  unit_cost: d(3200), reason: 'Relocated from HQ overstock' },
        ],
        created_by: AU._id,
    });
    console.log('✅ Stock Adjustments: 2');

    // ── 31. STOCK TRANSFERS ───────────────────────────────────────────────────
    await StockTransfer.deleteMany({ company_id: cid });
    await StockTransfer.create({ company_id: cid, from_warehouse_id: whMain._id, to_warehouse_id: whEast._id, product_id: prods['PRD-007']._id, quantity: 5, transfer_date: ago(15), notes: 'Replenish East Coast Depot — switches for CUS-003 project', created_by: AU._id });
    await StockTransfer.create({ company_id: cid, from_warehouse_id: whEast._id, to_warehouse_id: whMain._id, product_id: prods['PRD-008']._id, quantity: 3, transfer_date: ago(8),  notes: 'Return excess security keys after project completion', created_by: AU._id });
    console.log('✅ Stock Transfers: 2');

    // ── 32. RECURRING TEMPLATES ───────────────────────────────────────────────
    await RecurringTemplate.deleteMany({ company_id: cid });
    await RecurringTemplate.create({
        company_id: cid, name: 'Monthly Office Rent', type: 'Journal',
        frequency: 'Monthly', next_run_date: mS(1), is_active: true,
        last_run_date: mS(0), notes: 'Auto-post rent on 1st of each month.',
        line_items: [
            { account_id: accts['6100']._id, description: 'Office Rent', quantity: 1, unit_price: d(15000) },
        ],
    });
    await RecurringTemplate.create({
        company_id: cid, name: 'Monthly AWS Subscription', type: 'Journal',
        frequency: 'Monthly', next_run_date: mS(1), is_active: true,
        last_run_date: mS(0), notes: 'Monthly AWS cloud hosting charge accrual.',
        line_items: [
            { account_id: accts['6200']._id, description: 'AWS Cloud Hosting', quantity: 1, unit_price: d(4800) },
        ],
    });
    await RecurringTemplate.create({
        company_id: cid, name: 'Quarterly Marketing Budget', type: 'Journal',
        frequency: 'Quarterly', next_run_date: mS(3), is_active: false,
        notes: 'Quarterly marketing spend accrual. Currently paused.',
        line_items: [
            { account_id: accts['6300']._id, description: 'Marketing Budget', quantity: 1, unit_price: d(15000) },
        ],
    });
    console.log('✅ Recurring Templates: 3');

    // ── 33. MESSAGES ──────────────────────────────────────────────────────────
    await Message.deleteMany({ company_id: cid });
    await Message.create({
        company_id: cid, sender_id: users['sarah@demo.com']._id,
        recipients: [AU._id], subject: 'CUS-003 Overdue Invoice — Action Required',
        body: 'Hi,\n\nVertex Manufacturing (CUS-003) still has INV-2025-003 outstanding at $11,979 — 35 days overdue. I\'ve sent two reminders. Can we escalate to collections?\n\nBest,\nSarah',
        read_by: [], priority: 'High',
    });
    await Message.create({
        company_id: cid, sender_id: AU._id,
        recipients: [users['james@demo.com']._id], subject: 'EMP-004 Timesheet Pending Approval',
        body: 'James,\n\nDaniel\'s timesheet for last week (39 hours) is submitted and waiting your approval. Please review by EOD.\n\nThanks,\nAdmin',
        read_by: [users['james@demo.com']._id], priority: 'Normal',
    });
    await Message.create({
        company_id: cid, sender_id: users['priya@demo.com']._id,
        recipients: [users['james@demo.com']._id], subject: 'Q3 Payroll Processing — Reminder',
        body: 'Hi James,\n\nReminder: Q3 payroll must be finalised by end of this week. Ensure all October timesheets are approved first.\n\nRegards,\nPriya (CFO)',
        read_by: [], priority: 'High',
    });
    console.log('✅ Messages: 3');

    // ── 34. APPROVALS ─────────────────────────────────────────────────────────
    await ApprovalRequest.deleteMany({ company_id: cid });
    await ApprovalRequest.create({
        company_id: cid, entity_type: 'PurchaseOrder', entity_id: pos['PO-2025-003']._id,
        entity_ref: 'PO-2025-003', description: 'Cisco network switch order — $4,860 total',
        amount: d(4860), currency: 'USD', status: 'Pending',
        requested_by: users['sarah@demo.com']._id,
        steps: [
            { approver_id: users['priya@demo.com']._id, status: 'Pending', order: 1 },
            { approver_id: AU._id, status: 'Pending', order: 2 },
        ],
    });
    await ApprovalRequest.create({
        company_id: cid, entity_type: 'ExpenseClaim', entity_id: oid(),
        entity_ref: 'EXP-2025-003', description: 'Marketing expenses — Emily Watson $513',
        amount: d(513), currency: 'USD', status: 'Pending',
        requested_by: users['james@demo.com']._id,
        steps: [{ approver_id: users['james@demo.com']._id, status: 'Pending', order: 1 }],
    });
    await ApprovalRequest.create({
        company_id: cid, entity_type: 'LeaveRequest', entity_id: oid(),
        entity_ref: 'Annual Leave — EMP-004', description: 'Daniel Nguyen — 5 days annual leave',
        amount: d(0), currency: 'USD', status: 'Pending',
        requested_by: users['james@demo.com']._id,
        steps: [{ approver_id: users['james@demo.com']._id, status: 'Pending', order: 1 }],
    });
    await ApprovalRequest.create({
        company_id: cid, entity_type: 'Invoice', entity_id: oid(),
        entity_ref: 'INV-2025-003', description: 'Overdue invoice — Vertex Manufacturing $11,979',
        amount: d(11979), currency: 'USD', status: 'Approved',
        requested_by: AU._id,
        steps: [{ approver_id: users['priya@demo.com']._id, status: 'Approved', acted_at: ago(30), comments: 'Approved. Collections team to follow up.', order: 1 }],
        completed_at: ago(30),
    });
    console.log('✅ Approval Requests: 4 (3 pending, 1 approved)');

    // ── DONE ──────────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('🎉  DEMO SEED COMPLETE');
    console.log('═'.repeat(60));
    console.log(`Company    : Avenirya Technologies Ltd.`);
    console.log(`Company ID : ${cid}`);
    console.log('');
    console.log('Login credentials (password: Admin@123):');
    console.log('  admin@demo.com  — Full Admin');
    console.log('  sarah@demo.com  — Sales Manager');
    console.log('  james@demo.com  — HR Officer');
    console.log('  priya@demo.com  — CFO / Admin');
    console.log('');
    console.log('Seeded:');
    console.log('  28 COA accounts · 5 accounting periods · 4 exchange rates');
    console.log('  6 customers · 5 vendors · 10 products · 2 warehouses');
    console.log('  8 CRM leads · 5 quotations · 5 sales orders');
    console.log('  8 AR invoices · 2 credit notes');
    console.log('  5 POs · 3 GRNs · 4 purchase bills · 1 debit note');
    console.log('  6 employees · 2 salary structures · 5 payslips');
    console.log('  5 leave requests · 4 timesheets · 3 expense claims');
    console.log('  4 payments · 5 fixed assets · 1 annual budget');
    console.log('  3 journal entries · 3 recurring templates');
    console.log('  2 stock adjustments · 2 stock transfers');
    console.log('  4 approval requests · 3 messages · 2 bank accounts');
    console.log('═'.repeat(60));

    await mongoose.disconnect();
}

run().catch(err => { console.error('\n❌ Seed failed:', err.message, '\n', err.stack?.split('\n').slice(0,5).join('\n')); process.exit(1); });
