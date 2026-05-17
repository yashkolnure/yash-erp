const StockAdjustment = require('../models/StockAdjustment');
const StockBalance = require('../models/StockBalance');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');

const generateAdjNumber = async (companyId) => {
    const count = await StockAdjustment.countDocuments({ company_id: companyId });
    return `ADJ-${String(count + 1).padStart(5, '0')}`;
};

exports.createAdjustment = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { adjustment_date, adjustment_type, lines, notes, reference } = req.body;

        const adjustment_number = await generateAdjNumber(companyId);

        // Enrich lines with current quantities
        const enrichedLines = await Promise.all((lines || []).map(async line => {
            const sb = await StockBalance.findOne({ company_id: companyId, product_id: line.product_id, warehouse_id: line.warehouse_id });
            const current = parseFloat(sb?.quantity_on_hand?.toString() || 0);
            let new_quantity = current;
            if (line.adjustment_type === 'Add') new_quantity = current + line.quantity;
            else if (line.adjustment_type === 'Remove') new_quantity = Math.max(0, current - line.quantity);
            else if (line.adjustment_type === 'Set') new_quantity = line.quantity;
            return { ...line, current_quantity: current, new_quantity };
        }));

        const adj = await StockAdjustment.create({
            company_id: companyId, adjustment_number,
            adjustment_date: adjustment_date || new Date(),
            adjustment_type, lines: enrichedLines, notes, reference,
            created_by: req.user.userId,
        });

        res.status(201).json({ success: true, data: adj });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listAdjustments = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, skip = 0, limit = 20 } = req.query;
        const filter = { company_id: companyId };
        if (status) filter.status = status;
        const [adjs, total] = await Promise.all([
            StockAdjustment.find(filter).sort({ adjustment_date: -1 }).skip(+skip).limit(+limit),
            StockAdjustment.countDocuments(filter),
        ]);
        res.json({ success: true, data: adjs, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getAdjustment = async (req, res) => {
    try {
        const adj = await StockAdjustment.findById(req.params.id).populate('lines.product_id', 'product_name product_code').populate('lines.warehouse_id', 'warehouse_name');
        if (!adj) return res.status(404).json({ error: 'Adjustment not found' });
        res.json({ success: true, data: adj });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.postAdjustment = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const adj = await StockAdjustment.findById(id);
        if (!adj) return res.status(404).json({ error: 'Adjustment not found' });
        if (adj.status === 'Posted') return res.status(400).json({ error: 'Already posted' });

        // Apply stock changes
        for (const line of adj.lines) {
            const filter = { company_id: companyId, product_id: line.product_id, warehouse_id: line.warehouse_id };
            const sb = await StockBalance.findOne(filter);
            const current = parseFloat(sb?.quantity_on_hand?.toString() || 0);
            let new_qty = current;
            if (line.adjustment_type === 'Add') new_qty = current + line.quantity;
            else if (line.adjustment_type === 'Remove') new_qty = Math.max(0, current - line.quantity);
            else if (line.adjustment_type === 'Set') new_qty = line.quantity;

            await StockBalance.findOneAndUpdate(filter, { $set: { quantity_on_hand: new_qty, last_updated: new Date() } }, { upsert: true });
        }

        adj.status = 'Posted';
        adj.posted_by = req.user.userId;
        adj.posted_at = new Date();
        await adj.save();

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'StockAdjustment', entity_id: adj._id, action: 'Post', ip_address: req.ip, timestamp: new Date() });

        res.json({ success: true, data: adj, message: 'Stock adjustment posted' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getStockValuation = async (req, res) => {
    try {
        const { companyId } = req.params;
        const stocks = await StockBalance.find({ company_id: companyId }).populate('product_id', 'product_name product_code selling_price cost_price').populate('warehouse_id', 'warehouse_name');

        const rows = stocks.map(s => {
            const qty = parseFloat(s.quantity_on_hand?.toString() || 0);
            const cost = parseFloat(s.product_id?.cost_price?.toString() || 0);
            return { product: s.product_id, warehouse: s.warehouse_id, quantity: qty, cost_price: cost, total_value: qty * cost };
        });

        const total_value = rows.reduce((s, r) => s + r.total_value, 0);
        res.json({ success: true, data: rows, total_value });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getReorderAlerts = async (req, res) => {
    try {
        const { companyId } = req.params;
        const products = await Product.find({ company_id: companyId, is_active: true, reorder_point: { $gt: 0 } });
        const alerts = [];
        for (const p of products) {
            const stocks = await StockBalance.find({ company_id: companyId, product_id: p._id });
            const total_qty = stocks.reduce((s, sb) => s + parseFloat(sb.quantity_on_hand?.toString() || 0), 0);
            if (total_qty <= parseFloat(p.reorder_point?.toString() || 0)) {
                alerts.push({ product: p, current_stock: total_qty, reorder_point: parseFloat(p.reorder_point?.toString() || 0), shortage: parseFloat(p.reorder_point?.toString() || 0) - total_qty });
            }
        }
        res.json({ success: true, data: alerts, count: alerts.length });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
