const ChartOfAccounts = require('../models/ChartOfAccounts');
const GLBalance = require('../models/GLBalance');
const JournalEntry = require('../models/JournalEntry');
const Invoice = require('../models/Invoice');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');

const getAccountBalances = async (companyId, from_date, to_date) => {
    const accounts = await ChartOfAccounts.find({ company_id: companyId, is_active: true });

    // Get all posted journal lines in the date range
    const entries = await JournalEntry.find({
        company_id: companyId, status: 'Posted',
        ...(from_date || to_date ? { journal_date: { ...(from_date ? { $gte: new Date(from_date) } : {}), ...(to_date ? { $lte: new Date(to_date) } : {}) } } : {}),
    });

    const balances = {};
    for (const acc of accounts) balances[acc._id.toString()] = { account: acc, debit: 0, credit: 0, balance: 0 };

    for (const entry of entries) {
        for (const line of entry.lines) {
            const id = line.account_id?.toString();
            if (balances[id]) {
                balances[id].debit += parseFloat(line.debit_amount || 0);
                balances[id].credit += parseFloat(line.credit_amount || 0);
            }
        }
    }

    for (const id in balances) {
        const b = balances[id];
        b.balance = b.account.normal_balance === 'Debit' ? b.debit - b.credit : b.credit - b.debit;
    }

    return Object.values(balances);
};

/* ── Profit & Loss ──────────────────────────────────────────────────────── */
exports.getProfitLoss = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { from_date, to_date } = req.query;

        const balances = await getAccountBalances(companyId, from_date, to_date);

        const income = balances.filter(b => b.account.account_type === 'Income' && b.balance !== 0);
        const expenses = balances.filter(b => b.account.account_type === 'Expense' && b.balance !== 0);

        const total_income = income.reduce((s, b) => s + b.balance, 0);
        const total_expenses = expenses.reduce((s, b) => s + b.balance, 0);
        const net_profit = total_income - total_expenses;

        res.json({
            success: true,
            data: { income, expenses, total_income, total_expenses, net_profit },
            period: { from_date, to_date },
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

/* ── Balance Sheet ──────────────────────────────────────────────────────── */
exports.getBalanceSheet = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { as_of_date } = req.query;

        const balances = await getAccountBalances(companyId, null, as_of_date);

        const assets = balances.filter(b => b.account.account_type === 'Asset' && b.balance !== 0);
        const liabilities = balances.filter(b => b.account.account_type === 'Liability' && b.balance !== 0);
        const equity = balances.filter(b => b.account.account_type === 'Equity' && b.balance !== 0);

        const total_assets = assets.reduce((s, b) => s + b.balance, 0);
        const total_liabilities = liabilities.reduce((s, b) => s + b.balance, 0);
        const total_equity = equity.reduce((s, b) => s + b.balance, 0);

        // Retained earnings (net P&L to date)
        const income = balances.filter(b => b.account.account_type === 'Income');
        const expenses = balances.filter(b => b.account.account_type === 'Expense');
        const retained_earnings = income.reduce((s, b) => s + b.balance, 0) - expenses.reduce((s, b) => s + b.balance, 0);

        res.json({
            success: true,
            data: { assets, liabilities, equity, retained_earnings, total_assets, total_liabilities, total_equity },
            as_of_date: as_of_date || new Date(),
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

/* ── Cash Flow ──────────────────────────────────────────────────────────── */
exports.getCashFlow = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { from_date, to_date } = req.query;
        const dateFilter = {};
        if (from_date) dateFilter.$gte = new Date(from_date);
        if (to_date) dateFilter.$lte = new Date(to_date);

        const payments = await Payment.find({
            company_id: companyId,
            status: 'Posted',
            ...(Object.keys(dateFilter).length ? { payment_date: dateFilter } : {}),
        });

        const inflows = payments.filter(p => p.payment_type === 'Receipt');
        const outflows = payments.filter(p => p.payment_type === 'Payment');

        const total_inflow = inflows.reduce((s, p) => s + parseFloat(p.amount?.toString() || 0), 0);
        const total_outflow = outflows.reduce((s, p) => s + parseFloat(p.amount?.toString() || 0), 0);
        const net_cash_flow = total_inflow - total_outflow;

        res.json({
            success: true,
            data: { inflows, outflows, total_inflow, total_outflow, net_cash_flow },
            period: { from_date, to_date },
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

/* ── GST / Tax Report ───────────────────────────────────────────────────── */
exports.getTaxReport = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { from_date, to_date } = req.query;
        const dateFilter = {};
        if (from_date) dateFilter.$gte = new Date(from_date);
        if (to_date) dateFilter.$lte = new Date(to_date);
        const dateQ = Object.keys(dateFilter).length ? dateFilter : undefined;

        const [invoices, purchaseInvoices] = await Promise.all([
            Invoice.find({ company_id: companyId, status: { $in: ['Posted', 'Partially Paid', 'Paid'] }, ...(dateQ ? { invoice_date: dateQ } : {}) }).populate('customer_id', 'customer_name'),
            PurchaseInvoice.find({ company_id: companyId, status: { $in: ['Posted', 'Paid'] }, ...(dateQ ? { bill_date: dateQ } : {}) }),
        ]);

        const output_tax = invoices.reduce((s, inv) => s + parseFloat(inv.tax_amount?.toString() || 0), 0);
        const output_taxable = invoices.reduce((s, inv) => s + parseFloat(inv.subtotal?.toString() || 0), 0);

        const input_tax = purchaseInvoices.reduce((s, pi) => s + parseFloat(pi.tax_amount?.toString() || 0), 0);
        const input_taxable = purchaseInvoices.reduce((s, pi) => s + parseFloat(pi.subtotal?.toString() || 0), 0);

        const net_tax_payable = output_tax - input_tax;

        res.json({
            success: true,
            data: {
                output: { invoices: invoices.map(inv => ({ number: inv.invoice_number, customer: inv.customer_id?.customer_name, date: inv.invoice_date, taxable: parseFloat(inv.subtotal?.toString() || 0), tax: parseFloat(inv.tax_amount?.toString() || 0) })), total_taxable: output_taxable, total_tax: output_tax },
                input: { invoices: purchaseInvoices.map(pi => ({ number: pi.bill_number, date: pi.bill_date, taxable: parseFloat(pi.subtotal?.toString() || 0), tax: parseFloat(pi.tax_amount?.toString() || 0) })), total_taxable: input_taxable, total_tax: input_tax },
                net_tax_payable,
            },
            period: { from_date, to_date },
        });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

/* ── Audit Log ──────────────────────────────────────────────────────────── */
exports.getAuditLogs = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { entity_type, action, user_id, from_date, to_date, skip = 0, limit = 50 } = req.query;
        const filter = { company_id: companyId };
        if (entity_type) filter.entity_type = entity_type;
        if (action) filter.action = action;
        if (user_id) filter.user_id = user_id;
        if (from_date || to_date) {
            filter.timestamp = {};
            if (from_date) filter.timestamp.$gte = new Date(from_date);
            if (to_date) filter.timestamp.$lte = new Date(to_date);
        }
        const [logs, total] = await Promise.all([
            AuditLog.find(filter).populate('user_id', 'first_name last_name email').sort({ timestamp: -1 }).skip(+skip).limit(+limit),
            AuditLog.countDocuments(filter),
        ]);
        res.json({ success: true, data: logs, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

/* ── AP Aging ───────────────────────────────────────────────────────────── */
exports.getAPAging = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { as_of_date } = req.query;
        const asOf = as_of_date ? new Date(as_of_date) : new Date();

        const PurchaseInvoice = require('../models/PurchaseInvoice');
        const bills = await PurchaseInvoice.find({
            company_id: companyId,
            status: { $in: ['Posted', 'Partially Paid'] },
        }).populate('vendor_id', 'vendor_name email phone');

        const buckets = { current: [], days1_30: [], days31_60: [], days61_90: [], over90: [] };

        bills.forEach(bill => {
            const due = new Date(bill.due_date);
            const daysOverdue = Math.floor((asOf - due) / (1000 * 60 * 60 * 24));
            const amountDue = parseFloat(bill.amount_due?.toString() || 0);
            if (amountDue <= 0) return;

            const entry = {
                _id: bill._id,
                bill_number: bill.bill_number || bill.invoice_number,
                vendor: bill.vendor_id?.vendor_name || '—',
                vendor_id: bill.vendor_id?._id,
                due_date: bill.due_date,
                total_amount: parseFloat(bill.total_amount?.toString() || 0),
                amount_due: amountDue,
                days_overdue: daysOverdue,
            };

            if (daysOverdue <= 0) buckets.current.push(entry);
            else if (daysOverdue <= 30) buckets.days1_30.push(entry);
            else if (daysOverdue <= 60) buckets.days31_60.push(entry);
            else if (daysOverdue <= 90) buckets.days61_90.push(entry);
            else buckets.over90.push(entry);
        });

        const sum = (arr) => arr.reduce((s, b) => s + b.amount_due, 0);

        // Group by vendor for summary
        const vendorMap = {};
        Object.entries(buckets).forEach(([bucket, entries]) => {
            entries.forEach(e => {
                if (!vendorMap[e.vendor]) vendorMap[e.vendor] = { vendor: e.vendor, vendor_id: e.vendor_id, current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 };
                vendorMap[e.vendor][bucket] += e.amount_due;
                vendorMap[e.vendor].total += e.amount_due;
            });
        });

        res.json({
            success: true,
            data: {
                as_of_date: asOf,
                summary: Object.values(vendorMap).sort((a, b) => b.total - a.total),
                buckets,
                totals: { current: sum(buckets.current), days1_30: sum(buckets.days1_30), days31_60: sum(buckets.days31_60), days61_90: sum(buckets.days61_90), over90: sum(buckets.over90), grand_total: sum([...buckets.current, ...buckets.days1_30, ...buckets.days31_60, ...buckets.days61_90, ...buckets.over90]) },
            },
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

/* ── AR Aging ───────────────────────────────────────────────────────────── */
exports.getARAging = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { as_of_date } = req.query;
        const asOf = as_of_date ? new Date(as_of_date) : new Date();

        const invoices = await Invoice.find({
            company_id: companyId,
            status: { $in: ['Posted', 'Partially Paid'] },
        }).populate('customer_id', 'customer_name email phone');

        const buckets = { current: [], days1_30: [], days31_60: [], days61_90: [], over90: [] };

        invoices.forEach(inv => {
            const due = new Date(inv.due_date);
            const daysOverdue = Math.floor((asOf - due) / (1000 * 60 * 60 * 24));
            const amountDue = parseFloat(inv.amount_due?.toString() || 0);
            if (amountDue <= 0) return;

            const entry = {
                _id: inv._id,
                invoice_number: inv.invoice_number,
                customer: inv.customer_id?.customer_name || '—',
                customer_id: inv.customer_id?._id,
                due_date: inv.due_date,
                total_amount: parseFloat(inv.total_amount?.toString() || 0),
                amount_due: amountDue,
                days_overdue: daysOverdue,
            };

            if (daysOverdue <= 0) buckets.current.push(entry);
            else if (daysOverdue <= 30) buckets.days1_30.push(entry);
            else if (daysOverdue <= 60) buckets.days31_60.push(entry);
            else if (daysOverdue <= 90) buckets.days61_90.push(entry);
            else buckets.over90.push(entry);
        });

        const sum = (arr) => arr.reduce((s, b) => s + b.amount_due, 0);

        // Group by customer for summary
        const customerMap = {};
        Object.entries(buckets).forEach(([bucket, entries]) => {
            entries.forEach(e => {
                if (!customerMap[e.customer]) customerMap[e.customer] = { customer: e.customer, customer_id: e.customer_id, current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, total: 0 };
                customerMap[e.customer][bucket] += e.amount_due;
                customerMap[e.customer].total += e.amount_due;
            });
        });

        res.json({
            success: true,
            data: {
                as_of_date: asOf,
                summary: Object.values(customerMap).sort((a, b) => b.total - a.total),
                buckets,
                totals: { current: sum(buckets.current), days1_30: sum(buckets.days1_30), days31_60: sum(buckets.days31_60), days61_90: sum(buckets.days61_90), over90: sum(buckets.over90), grand_total: sum([...buckets.current, ...buckets.days1_30, ...buckets.days31_60, ...buckets.days61_90, ...buckets.over90]) },
            },
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

/* ── Sales Analytics ────────────────────────────────────────────────────── */
exports.getSalesAnalytics = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { from_date, to_date } = req.query;
        const dateFilter = {};
        if (from_date) dateFilter.$gte = new Date(from_date);
        if (to_date) dateFilter.$lte = new Date(to_date);
        const dateQ = Object.keys(dateFilter).length ? dateFilter : undefined;

        const invoices = await Invoice.find({ company_id: companyId, status: { $nin: ['Cancelled', 'Draft'] }, ...(dateQ ? { invoice_date: dateQ } : {}) }).populate('customer_id', 'customer_name');

        // By status
        const by_status = {};
        for (const inv of invoices) { by_status[inv.status] = (by_status[inv.status] || 0) + parseFloat(inv.total_amount?.toString() || 0); }

        // Top customers
        const by_customer = {};
        for (const inv of invoices) {
            const name = inv.customer_id?.customer_name || 'Unknown';
            by_customer[name] = (by_customer[name] || 0) + parseFloat(inv.total_amount?.toString() || 0);
        }
        const top_customers = Object.entries(by_customer).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

        // Monthly trend
        const monthly = {};
        for (const inv of invoices) {
            const key = inv.invoice_date?.toISOString?.()?.slice(0, 7) || 'Unknown';
            monthly[key] = (monthly[key] || 0) + parseFloat(inv.total_amount?.toString() || 0);
        }
        const monthly_trend = Object.entries(monthly).sort().map(([month, value]) => ({ month, value }));

        res.json({ success: true, data: { total_revenue: Object.values(by_status).reduce((a, b) => a + b, 0), by_status, top_customers, monthly_trend, invoice_count: invoices.length } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
