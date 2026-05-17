const BankStatement = require('../models/BankStatement');
const Payment = require('../models/Payment');

// GET /:companyId/finance/reconciliation
exports.listStatements = async (req, res) => {
    try {
        const { companyId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = { company_id: companyId };
        if (req.query.bank_account_id) filter.bank_account_id = req.query.bank_account_id;
        if (req.query.status) filter.status = req.query.status;

        const [total, statements] = await Promise.all([
            BankStatement.countDocuments(filter),
            BankStatement.find(filter)
                .populate('bank_account_id', 'account_name account_number bank_name currency')
                .sort({ statement_date: -1 })
                .skip(skip)
                .limit(limit)
                .select('-lines'),
        ]);

        res.json({
            success: true,
            data: statements,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /:companyId/finance/reconciliation
exports.createStatement = async (req, res) => {
    try {
        const { companyId } = req.params;
        const {
            bank_account_id, statement_date, opening_balance,
            closing_balance, currency, lines,
        } = req.body;

        const statement = await BankStatement.create({
            company_id: companyId,
            bank_account_id,
            statement_date,
            opening_balance: opening_balance || 0,
            closing_balance: closing_balance || 0,
            currency: currency || 'USD',
            lines: (lines || []).map(l => ({
                date: l.date,
                description: l.description || '',
                reference: l.reference || '',
                debit: l.debit || 0,
                credit: l.credit || 0,
                balance: l.balance || 0,
                matched: false,
            })),
            created_by: req.user.userId,
        });

        const populated = await BankStatement.findById(statement._id)
            .populate('bank_account_id', 'account_name account_number bank_name currency');

        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /:companyId/finance/reconciliation/:statementId
exports.getStatement = async (req, res) => {
    try {
        const { companyId, statementId } = req.params;

        const statement = await BankStatement.findOne({ _id: statementId, company_id: companyId })
            .populate('bank_account_id', 'account_name account_number bank_name currency')
            .populate('lines.matched_payment_id', 'payment_date amount reference_number payment_type payment_method');

        if (!statement) return res.status(404).json({ error: 'Statement not found' });

        res.json({ success: true, data: statement });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /:companyId/finance/reconciliation/:statementId/match/:lineIndex
exports.matchLine = async (req, res) => {
    try {
        const { companyId, statementId, lineIndex } = req.params;
        const { payment_id } = req.body;

        if (!payment_id) return res.status(400).json({ error: 'payment_id is required' });

        const idx = parseInt(lineIndex);
        const statement = await BankStatement.findOne({ _id: statementId, company_id: companyId });
        if (!statement) return res.status(404).json({ error: 'Statement not found' });
        if (idx < 0 || idx >= statement.lines.length) return res.status(400).json({ error: 'Invalid line index' });

        // Verify payment belongs to same company
        const payment = await Payment.findOne({ _id: payment_id, company_id: companyId });
        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        statement.lines[idx].matched = true;
        statement.lines[idx].matched_payment_id = payment_id;
        statement.lines[idx].matched_at = new Date();

        // Update status
        const allMatched = statement.lines.every(l => l.matched);
        const anyMatched = statement.lines.some(l => l.matched);
        if (statement.status === 'Draft' && anyMatched) statement.status = 'Partial';
        if (allMatched) statement.status = 'Reconciled';

        await statement.save();

        const updated = await BankStatement.findById(statementId)
            .populate('bank_account_id', 'account_name account_number bank_name currency')
            .populate('lines.matched_payment_id', 'payment_date amount reference_number payment_type payment_method');

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /:companyId/finance/reconciliation/:statementId/unmatch/:lineIndex
exports.unmatchLine = async (req, res) => {
    try {
        const { companyId, statementId, lineIndex } = req.params;

        const idx = parseInt(lineIndex);
        const statement = await BankStatement.findOne({ _id: statementId, company_id: companyId });
        if (!statement) return res.status(404).json({ error: 'Statement not found' });
        if (idx < 0 || idx >= statement.lines.length) return res.status(400).json({ error: 'Invalid line index' });

        statement.lines[idx].matched = false;
        statement.lines[idx].matched_payment_id = undefined;
        statement.lines[idx].matched_at = undefined;

        // Recalculate status
        const allMatched = statement.lines.every(l => l.matched);
        const anyMatched = statement.lines.some(l => l.matched);
        if (allMatched) {
            statement.status = 'Reconciled';
        } else if (anyMatched) {
            statement.status = 'Partial';
        } else {
            statement.status = 'Draft';
        }

        await statement.save();

        const updated = await BankStatement.findById(statementId)
            .populate('bank_account_id', 'account_name account_number bank_name currency')
            .populate('lines.matched_payment_id', 'payment_date amount reference_number payment_type payment_method');

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /:companyId/finance/reconciliation/:statementId/reconcile
exports.reconcile = async (req, res) => {
    try {
        const { companyId, statementId } = req.params;
        const { allow_partial } = req.body;

        const statement = await BankStatement.findOne({ _id: statementId, company_id: companyId });
        if (!statement) return res.status(404).json({ error: 'Statement not found' });

        const allMatched = statement.lines.every(l => l.matched);
        const anyMatched = statement.lines.some(l => l.matched);

        if (!allMatched && !allow_partial) {
            return res.status(400).json({
                error: 'Not all lines are matched. Pass allow_partial: true to reconcile partially.',
                unmatched_count: statement.lines.filter(l => !l.matched).length,
            });
        }

        statement.status = allMatched ? 'Reconciled' : 'Partial';
        statement.reconciled_at = new Date();
        await statement.save();

        res.json({ success: true, data: statement });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /:companyId/finance/reconciliation/:statementId/suggestions
exports.getSuggestions = async (req, res) => {
    try {
        const { companyId, statementId } = req.params;

        const statement = await BankStatement.findOne({ _id: statementId, company_id: companyId });
        if (!statement) return res.status(404).json({ error: 'Statement not found' });

        // Unmatched lines
        const unmatchedLines = statement.lines
            .map((line, index) => ({ ...line.toObject(), lineIndex: index }))
            .filter(l => !l.matched);

        // Date range from the statement lines (or fall back to statement_date ± 30 days)
        const dates = statement.lines.map(l => new Date(l.date)).filter(d => !isNaN(d));
        const minDate = dates.length ? new Date(Math.min(...dates)) : new Date(statement.statement_date);
        const maxDate = dates.length ? new Date(Math.max(...dates)) : new Date(statement.statement_date);

        // Pad range by 5 days on each side for loose matching
        minDate.setDate(minDate.getDate() - 5);
        maxDate.setDate(maxDate.getDate() + 5);

        // Unreconciled payments in range for this company
        const payments = await Payment.find({
            company_id: companyId,
            payment_date: { $gte: minDate, $lte: maxDate },
        })
            .sort({ payment_date: 1 })
            .limit(100);

        // Filter out payments already matched in this statement
        const matchedPaymentIds = statement.lines
            .filter(l => l.matched && l.matched_payment_id)
            .map(l => l.matched_payment_id.toString());

        const availablePayments = payments.filter(p => !matchedPaymentIds.includes(p._id.toString()));

        res.json({
            success: true,
            data: {
                unmatched_lines: unmatchedLines,
                available_payments: availablePayments,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
