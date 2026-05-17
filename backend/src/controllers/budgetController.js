const Budget = require('../models/Budget');
const GLBalance = require('../models/GLBalance');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const toNum = (v) => Number(v?.$numberDecimal ?? v ?? 0);

exports.listBudgets = async (req, res) => {
    try {
        const { companyId } = req.params;
        const budgets = await Budget.find({ company_id: companyId })
            .select('name fiscal_year status lines createdAt')
            .sort({ fiscal_year: -1, createdAt: -1 });

        const data = budgets.map(b => ({
            _id: b._id,
            name: b.name,
            fiscal_year: b.fiscal_year,
            status: b.status,
            line_count: b.lines?.length || 0,
            createdAt: b.createdAt,
        }));

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createBudget = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { name, fiscal_year, lines = [], notes } = req.body;

        // Compute totals for each line
        const processedLines = lines.map(line => {
            const total = MONTHS.reduce((sum, m) => sum + parseFloat(line[m] || 0), 0);
            return { ...line, total };
        });

        const budget = await Budget.create({
            company_id: companyId,
            name,
            fiscal_year,
            lines: processedLines,
            notes,
            created_by: req.user?.userId,
        });

        res.status(201).json({ success: true, data: budget });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getBudget = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.id);
        if (!budget) return res.status(404).json({ error: 'Budget not found' });
        res.json({ success: true, data: budget });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateBudget = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.id);
        if (!budget) return res.status(404).json({ error: 'Budget not found' });
        if (budget.status !== 'Draft') return res.status(400).json({ error: 'Only Draft budgets can be edited' });

        const { lines, name, notes } = req.body;
        const updateData = {};
        if (name) updateData.name = name;
        if (notes !== undefined) updateData.notes = notes;
        if (lines) {
            updateData.lines = lines.map(line => {
                const total = MONTHS.reduce((sum, m) => sum + parseFloat(line[m] || 0), 0);
                return { ...line, total };
            });
        }

        const updated = await Budget.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.activateBudget = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.id);
        if (!budget) return res.status(404).json({ error: 'Budget not found' });
        if (budget.status !== 'Draft') return res.status(400).json({ error: 'Only Draft budgets can be activated' });

        const updated = await Budget.findByIdAndUpdate(
            req.params.id,
            { status: 'Active' },
            { new: true }
        );

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getBudgetVariance = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.id);
        if (!budget) return res.status(404).json({ error: 'Budget not found' });

        const { companyId } = req.params;
        const { fiscal_year } = budget;

        // Fetch GL balances for the budget's fiscal year
        const glBalances = await GLBalance.find({
            company_id: companyId,
            fiscal_year,
        });

        // Group GL balances by account_id, sum debit - credit across all periods
        const actualByAccount = {};
        for (const gl of glBalances) {
            const key = gl.account_id.toString();
            const net = toNum(gl.debit_balance) - toNum(gl.credit_balance);
            actualByAccount[key] = (actualByAccount[key] || 0) + net;
        }

        const variance = budget.lines.map(line => {
            const budgeted = toNum(line.total);
            const actual = line.account_id ? (actualByAccount[line.account_id.toString()] || 0) : 0;
            const varAmt = budgeted - actual;
            const variance_pct = budgeted !== 0 ? ((varAmt / budgeted) * 100).toFixed(2) : null;

            return {
                account_id: line.account_id,
                account_name: line.account_name,
                budgeted: budgeted.toFixed(2),
                actual: actual.toFixed(2),
                variance: varAmt.toFixed(2),
                variance_pct,
            };
        });

        res.json({ success: true, data: variance, fiscal_year });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
