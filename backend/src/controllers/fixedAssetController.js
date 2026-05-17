const FixedAsset = require('../models/FixedAsset');
const DepreciationEntry = require('../models/DepreciationEntry');

const toNum = (v) => Number(v?.$numberDecimal ?? v ?? 0);

// Generate next asset code FA-XXXXX
async function generateAssetCode(companyId) {
    const last = await FixedAsset.findOne({ company_id: companyId })
        .sort({ createdAt: -1 })
        .select('asset_code');
    if (!last || !last.asset_code) return 'FA-00001';
    const num = parseInt(last.asset_code.replace('FA-', ''), 10);
    return `FA-${String(num + 1).padStart(5, '0')}`;
}

exports.listAssets = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, category, skip = 0, limit = 20 } = req.query;
        const filter = { company_id: companyId };
        if (status) filter.status = status;
        if (category) filter.category = category;

        const [data, total] = await Promise.all([
            FixedAsset.find(filter)
                .populate('vendor_id', 'vendor_name')
                .sort({ createdAt: -1 })
                .skip(Number(skip))
                .limit(Number(limit)),
            FixedAsset.countDocuments(filter),
        ]);

        res.json({ success: true, data, pagination: { total, skip: Number(skip), limit: Number(limit) } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createAsset = async (req, res) => {
    try {
        const { companyId } = req.params;
        const asset_code = await generateAssetCode(companyId);
        const { purchase_cost, salvage_value = 0 } = req.body;
        const nbv = parseFloat(purchase_cost) - parseFloat(salvage_value);

        const asset = await FixedAsset.create({
            ...req.body,
            company_id: companyId,
            asset_code,
            net_book_value: nbv,
            accumulated_depreciation: 0,
            created_by: req.user?.userId,
        });

        res.status(201).json({ success: true, data: asset });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAsset = async (req, res) => {
    try {
        const asset = await FixedAsset.findById(req.params.id)
            .populate('vendor_id', 'vendor_name');
        if (!asset) return res.status(404).json({ error: 'Asset not found' });

        const entries = await DepreciationEntry.find({ asset_id: asset._id }).sort({ createdAt: -1 });
        res.json({ success: true, data: asset, depreciation_entries: entries });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateAsset = async (req, res) => {
    try {
        const asset = await FixedAsset.findById(req.params.id);
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        if (asset.status !== 'Active') return res.status(400).json({ error: 'Only Active assets can be updated' });

        const updated = await FixedAsset.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.calculateDepreciation = async (req, res) => {
    try {
        const asset = await FixedAsset.findById(req.params.id);
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        if (asset.status !== 'Active') return res.status(400).json({ error: 'Asset is not Active' });

        const cost = toNum(asset.purchase_cost);
        const salvage = toNum(asset.salvage_value);
        const accumulated = toNum(asset.accumulated_depreciation);
        const nbv = toNum(asset.net_book_value);

        if (nbv <= salvage) {
            await FixedAsset.findByIdAndUpdate(asset._id, { status: 'Fully Depreciated' });
            return res.status(400).json({ error: 'Asset is already fully depreciated' });
        }

        let depAmount = 0;
        const method = asset.depreciation_method;

        if (method === 'Straight Line') {
            depAmount = (cost - salvage) / asset.useful_life_years / 12;
        } else if (method === 'Declining Balance') {
            const rate = (2 / asset.useful_life_years) / 12;
            depAmount = nbv * rate;
        } else {
            // Units of Production — treat same as Straight Line if no units provided
            depAmount = (cost - salvage) / asset.useful_life_years / 12;
        }

        // Cap so net_book_value doesn't drop below salvage
        const maxDep = nbv - salvage;
        depAmount = Math.min(depAmount, maxDep);
        depAmount = Math.max(depAmount, 0);

        const newAccumulated = accumulated + depAmount;
        const newNbv = cost - newAccumulated;

        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const entry = await DepreciationEntry.create({
            company_id: asset.company_id,
            asset_id: asset._id,
            period_start: periodStart,
            period_end: periodEnd,
            depreciation_amount: depAmount,
            accumulated_before: accumulated,
            net_book_value_after: newNbv,
            method,
            created_by: req.user?.userId,
        });

        const updateFields = {
            accumulated_depreciation: newAccumulated,
            net_book_value: newNbv,
        };
        if (newNbv <= salvage) updateFields.status = 'Fully Depreciated';

        await FixedAsset.findByIdAndUpdate(asset._id, updateFields);

        res.json({ success: true, data: entry });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.disposeAsset = async (req, res) => {
    try {
        const asset = await FixedAsset.findById(req.params.id);
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        if (asset.status === 'Disposed') return res.status(400).json({ error: 'Asset already disposed' });

        const { disposal_date, disposal_proceeds = 0, notes } = req.body;
        const updated = await FixedAsset.findByIdAndUpdate(
            asset._id,
            {
                status: 'Disposed',
                disposal_date: disposal_date || new Date(),
                disposal_proceeds,
                ...(notes && { notes }),
            },
            { new: true }
        );

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDepreciationSchedule = async (req, res) => {
    try {
        const asset = await FixedAsset.findById(req.params.id);
        if (!asset) return res.status(404).json({ error: 'Asset not found' });

        const cost = toNum(asset.purchase_cost);
        const salvage = toNum(asset.salvage_value);
        const method = asset.depreciation_method;
        const years = asset.useful_life_years;
        const totalMonths = years * 12;

        const schedule = [];
        let runningNbv = cost;
        let runningAccum = 0;
        const startDate = new Date(asset.purchase_date);

        for (let m = 0; m < totalMonths; m++) {
            if (runningNbv <= salvage) break;

            let depAmount = 0;
            if (method === 'Straight Line') {
                depAmount = (cost - salvage) / totalMonths;
            } else if (method === 'Declining Balance') {
                depAmount = runningNbv * (2 / years / 12);
            } else {
                depAmount = (cost - salvage) / totalMonths;
            }

            depAmount = Math.min(depAmount, runningNbv - salvage);

            const periodStart = new Date(startDate.getFullYear(), startDate.getMonth() + m, 1);
            const periodEnd = new Date(startDate.getFullYear(), startDate.getMonth() + m + 1, 0);
            runningAccum += depAmount;
            runningNbv -= depAmount;

            schedule.push({
                period: m + 1,
                period_start: periodStart,
                period_end: periodEnd,
                depreciation_amount: depAmount.toFixed(2),
                accumulated_depreciation: runningAccum.toFixed(2),
                net_book_value: runningNbv.toFixed(2),
            });
        }

        res.json({ success: true, data: schedule });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
