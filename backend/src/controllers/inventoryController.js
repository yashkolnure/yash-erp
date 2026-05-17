const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const StockBalance = require('../models/StockBalance');
const StockTransfer = require('../models/StockTransfer');
const AuditLog = require('../models/AuditLog');

exports.createProduct = async (req, res) => {
    try {
        const { companyId } = req.params;
        const count = await Product.countDocuments({ company_id: companyId });
        const product_code = req.body.product_code || `PRD-${String(count + 1).padStart(5, '0')}`;

        const product = await Product.create({ ...req.body, company_id: companyId, product_code });
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listProducts = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { search, category, type, skip = 0, limit = 20 } = req.query;

        const filter = { company_id: companyId, is_active: true };
        if (category) filter.category = category;
        if (type) filter.product_type = type;
        if (search) filter.$text = { $search: search };

        const [products, total] = await Promise.all([
            Product.find(filter).sort({ product_name: 1 }).skip(+skip).limit(+limit),
            Product.countDocuments(filter),
        ]);

        res.json({ success: true, data: products, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getStockLevels = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { warehouse_id, low_stock } = req.query;

        const filter = {};
        if (warehouse_id) filter.warehouse_id = warehouse_id;

        const stocks = await StockBalance.find(filter)
            .populate({ path: 'product_id', match: { company_id: companyId }, select: 'product_code product_name reorder_level' })
            .populate('warehouse_id', 'warehouse_name');

        let result = stocks.filter(s => s.product_id);

        if (low_stock === 'true') {
            result = result.filter(s => s.quantity_on_hand <= (s.product_id?.reorder_level || 0));
        }

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.stockTransfer = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { product_id, from_warehouse_id, to_warehouse_id, quantity, transfer_date, notes } = req.body;

        if (!product_id || !from_warehouse_id || !to_warehouse_id || !quantity) {
            return res.status(400).json({ error: 'product_id, from_warehouse_id, to_warehouse_id and quantity are required' });
        }
        if (from_warehouse_id === to_warehouse_id) {
            return res.status(400).json({ error: 'Source and destination warehouse must be different' });
        }

        const fromStock = await StockBalance.findOne({ product_id, warehouse_id: from_warehouse_id });
        if (!fromStock || fromStock.quantity_on_hand < quantity) {
            return res.status(400).json({ error: 'Insufficient stock in source warehouse' });
        }

        await Promise.all([
            StockBalance.findOneAndUpdate(
                { product_id, warehouse_id: from_warehouse_id },
                { $inc: { quantity_on_hand: -quantity } }
            ),
            StockBalance.findOneAndUpdate(
                { product_id, warehouse_id: to_warehouse_id },
                { $inc: { quantity_on_hand: quantity } },
                { upsert: true, setDefaultsOnInsert: true }
            ),
        ]);

        const transfer = await StockTransfer.create({
            company_id: companyId,
            product_id,
            from_warehouse_id,
            to_warehouse_id,
            quantity,
            transfer_date: transfer_date || new Date(),
            notes,
            created_by: req.user?.id,
        });

        res.json({ success: true, data: transfer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listTransfers = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { skip = 0, limit = 20 } = req.query;
        const [data, total] = await Promise.all([
            StockTransfer.find({ company_id: companyId })
                .populate('product_id', 'product_name product_code')
                .populate('from_warehouse_id', 'name')
                .populate('to_warehouse_id', 'name')
                .sort({ createdAt: -1 })
                .skip(Number(skip))
                .limit(Number(limit)),
            StockTransfer.countDocuments({ company_id: companyId }),
        ]);
        res.json({ success: true, data, pagination: { total } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createWarehouse = async (req, res) => {
    try {
        const { companyId } = req.params;
        const count = await Warehouse.countDocuments({ company_id: companyId });
        const warehouse_code = req.body.warehouse_code || `WH-${String(count + 1).padStart(3, '0')}`;

        const warehouse = await Warehouse.create({ ...req.body, company_id: companyId, warehouse_code });
        res.status(201).json({ success: true, data: warehouse });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listWarehouses = async (req, res) => {
    try {
        const { companyId } = req.params;
        const warehouses = await Warehouse.find({ company_id: companyId, is_active: true });
        res.json({ success: true, data: warehouses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
