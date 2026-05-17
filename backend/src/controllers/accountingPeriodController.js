const AccountingPeriod = require('../models/AccountingPeriod');

exports.listPeriods = async (req, res) => {
    try {
        const { companyId } = req.params;
        const periods = await AccountingPeriod.find({ company_id: companyId })
            .sort({ year: -1, month: -1 })
            .limit(36);
        res.json({ success: true, data: periods });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.openPeriod = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { year, month } = req.body;
        const period = await AccountingPeriod.findOneAndUpdate(
            { company_id: companyId, year, month },
            { status: 'Open', $unset: { closed_at: 1, closed_by: 1 } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json({ success: true, data: period });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.closePeriod = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { year, month } = req.body;
        const period = await AccountingPeriod.findOneAndUpdate(
            { company_id: companyId, year, month },
            { status: 'Closed', closed_at: new Date(), closed_by: req.user?.id },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json({ success: true, data: period });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPeriodStatus = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { year, month } = req.query;
        const period = await AccountingPeriod.findOne({ company_id: companyId, year: Number(year), month: Number(month) });
        res.json({ success: true, data: period || { year, month, status: 'Open' } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
