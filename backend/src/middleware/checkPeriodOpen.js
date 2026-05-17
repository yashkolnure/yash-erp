const AccountingPeriod = require('../models/AccountingPeriod');

module.exports = async (req, res, next) => {
    try {
        const { companyId } = req.params;
        // Use posting_date or today if not provided in body
        const postingDate = req.body?.posting_date ? new Date(req.body.posting_date) : new Date();
        const year = postingDate.getFullYear();
        const month = postingDate.getMonth() + 1;

        const period = await AccountingPeriod.findOne({ company_id: companyId, year, month });
        if (period && period.status === 'Closed') {
            return res.status(400).json({ error: `Accounting period ${year}-${String(month).padStart(2, '0')} is closed. No transactions can be posted.` });
        }
        next();
    } catch (err) {
        next(err);
    }
};
