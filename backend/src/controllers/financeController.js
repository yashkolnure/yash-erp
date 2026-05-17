const ChartOfAccounts = require('../models/ChartOfAccounts');
const JournalEntry = require('../models/JournalEntry');
const GLBalance = require('../models/GLBalance');
const Invoice = require('../models/Invoice');
const PurchaseInvoice = require('../models/PurchaseInvoice');

exports.createAccount = async (req, res) => {
    try {
        const { companyId } = req.params;
        const account = await ChartOfAccounts.create({ ...req.body, company_id: companyId });
        res.status(201).json({ success: true, data: account });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listAccounts = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { account_type, is_header } = req.query;

        const filter = { company_id: companyId, is_active: true };
        if (account_type) filter.account_type = account_type;
        if (is_header !== undefined) filter.is_header = is_header === 'true';

        const accounts = await ChartOfAccounts.find(filter).sort({ account_number: 1 });
        res.json({ success: true, data: accounts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateAccount = async (req, res) => {
    try {
        const account = await ChartOfAccounts.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!account) return res.status(404).json({ error: 'Account not found' });
        res.json({ success: true, data: account });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createJournalEntry = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { journal_date, description, lines, reference_number } = req.body;

        const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0);
        const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({ error: 'Journal entry is not balanced (debits must equal credits)' });
        }

        const entry = await JournalEntry.create({
            company_id: companyId,
            journal_date,
            description,
            reference_number,
            lines,
            status: 'Draft',
            created_by: req.user.userId,
        });

        res.status(201).json({ success: true, data: entry });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.postJournalEntry = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const entry = await JournalEntry.findById(id);
        if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
        if (entry.status !== 'Draft') return res.status(400).json({ error: 'Entry already posted' });

        const now = new Date();
        const fiscalYear = now.getFullYear();
        const fiscalPeriod = now.getMonth() + 1;

        for (const line of entry.lines) {
            await GLBalance.findOneAndUpdate(
                { account_id: line.account_id, company_id: companyId, fiscal_year: fiscalYear, fiscal_period: fiscalPeriod },
                { $inc: { debit_balance: parseFloat(line.debit_amount?.toString() || 0), credit_balance: parseFloat(line.credit_amount?.toString() || 0) } },
                { upsert: true }
            );
        }

        entry.status = 'Posted';
        entry.posted_by = req.user.userId;
        entry.posted_at = new Date();
        await entry.save();

        res.json({ success: true, data: entry, message: 'Journal entry posted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listJournalEntries = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, from_date, to_date, skip = 0, limit = 20 } = req.query;

        const filter = { company_id: companyId };
        if (status) filter.status = status;
        if (from_date || to_date) {
            filter.journal_date = {};
            if (from_date) filter.journal_date.$gte = new Date(from_date);
            if (to_date) filter.journal_date.$lte = new Date(to_date);
        }

        const [entries, total] = await Promise.all([
            JournalEntry.find(filter).populate('lines.account_id', 'account_number account_name').sort({ journal_date: -1 }).skip(+skip).limit(+limit),
            JournalEntry.countDocuments(filter),
        ]);

        res.json({ success: true, data: entries, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTrialBalance = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { fiscal_year, fiscal_period } = req.query;

        const filter = { company_id: companyId };
        if (fiscal_year) filter.fiscal_year = +fiscal_year;
        if (fiscal_period) filter.fiscal_period = +fiscal_period;

        const balances = await GLBalance.find(filter).populate('account_id', 'account_number account_name account_type normal_balance');

        const report = balances.map(b => {
            const debit = parseFloat(b.debit_balance?.toString() || 0);
            const credit = parseFloat(b.credit_balance?.toString() || 0);
            const net = debit - credit;
            return {
                account_number: b.account_id?.account_number,
                account_name: b.account_id?.account_name,
                account_type: b.account_id?.account_type,
                fiscal_year: b.fiscal_year,
                fiscal_period: b.fiscal_period,
                debit_balance: debit,
                credit_balance: credit,
                net_balance: net,
            };
        });

        const totalDebit = report.reduce((s, r) => s + r.debit_balance, 0);
        const totalCredit = report.reduce((s, r) => s + r.credit_balance, 0);

        res.json({ success: true, data: report, totals: { total_debit: totalDebit, total_credit: totalCredit } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDashboard = async (req, res) => {
    try {
        const { companyId } = req.params;

        const [totalRevenue, pendingInvoices, openPOs, overdueInvoices] = await Promise.all([
            Invoice.aggregate([
                { $match: { company_id: companyId, status: { $in: ['Posted', 'Partially Paid', 'Paid'] } } },
                { $group: { _id: null, total: { $sum: { $toDouble: '$total_amount' } } } },
            ]),
            Invoice.countDocuments({ company_id: companyId, status: { $in: ['Posted', 'Partially Paid'] } }),
            PurchaseInvoice ? 0 : 0,
            Invoice.countDocuments({ company_id: companyId, status: 'Overdue' }),
        ]);

        res.json({
            success: true,
            data: {
                totalRevenue: totalRevenue[0]?.total || 0,
                pendingInvoices,
                overdueInvoices,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
