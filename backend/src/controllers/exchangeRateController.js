const ExchangeRate = require('../models/ExchangeRate');

exports.listRates = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { from_currency, to_currency } = req.query;
        const filter = { company_id: companyId };
        if (from_currency) filter.from_currency = from_currency;
        if (to_currency) filter.to_currency = to_currency;
        const rates = await ExchangeRate.find(filter).sort({ effective_date: -1 }).limit(100);
        res.json({ success: true, data: rates });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createRate = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { from_currency, to_currency, rate, effective_date, source } = req.body;
        const record = await ExchangeRate.create({
            company_id: companyId, from_currency, to_currency,
            rate, effective_date: effective_date || new Date(), source: source || 'Manual',
        });
        res.status(201).json({ success: true, data: record });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateRate = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const record = await ExchangeRate.findOneAndUpdate(
            { _id: id, company_id: companyId },
            { $set: req.body },
            { new: true }
        );
        if (!record) return res.status(404).json({ error: 'Rate not found' });
        res.json({ success: true, data: record });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteRate = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        await ExchangeRate.findOneAndDelete({ _id: id, company_id: companyId });
        res.json({ success: true, message: 'Rate deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// Get the most recent rate for a currency pair
exports.getRate = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { from, to } = req.query;
        const rate = await ExchangeRate.findOne({ company_id: companyId, from_currency: from, to_currency: to }).sort({ effective_date: -1 });
        res.json({ success: true, data: rate });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
