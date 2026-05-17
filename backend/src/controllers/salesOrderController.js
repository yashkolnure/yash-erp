const SalesOrder = require('../models/SalesOrder');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const { generateDocumentNumber, calculateLineItems } = require('../utils/helpers');

exports.createSalesOrder = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { customer_id, order_date, required_date, line_items, notes, currency, assigned_to, priority } = req.body;

        const customer = await Customer.findById(customer_id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const order_number = await generateDocumentNumber(SalesOrder, 'SO', 'order_number', companyId);
        const { line_items: calculatedItems, subtotal, tax_amount } = calculateLineItems(line_items || []);
        const total_amount = subtotal + tax_amount;

        const order = await SalesOrder.create({
            company_id: companyId,
            order_number,
            customer_id,
            order_date: order_date || new Date(),
            required_date,
            line_items: calculatedItems,
            subtotal,
            tax_amount,
            total_amount,
            currency: currency || 'USD',
            notes,
            assigned_to: assigned_to || null,
            priority: priority || 'Normal',
            created_by: req.user.userId,
        });

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'SalesOrder', entity_id: order._id, action: 'Create', new_values: order.toObject(), ip_address: req.ip, timestamp: new Date() });

        res.status(201).json({ success: true, data: order, message: 'Sales order created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSalesOrder = async (req, res) => {
    try {
        const order = await SalesOrder.findById(req.params.id).populate('customer_id').populate('line_items.product_id', 'product_name');
        if (!order) return res.status(404).json({ error: 'Sales order not found' });
        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listSalesOrders = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, customer_id, skip = 0, limit = 20 } = req.query;

        const filter = { company_id: companyId };
        if (status) filter.status = status;
        if (customer_id) filter.customer_id = customer_id;

        const [orders, total] = await Promise.all([
            SalesOrder.find(filter).populate('customer_id', 'customer_name').populate('assigned_to', 'first_name last_name email').sort({ order_date: -1 }).skip(+skip).limit(+limit),
            SalesOrder.countDocuments(filter),
        ]);

        res.json({ success: true, data: orders, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSalesOrder = async (req, res) => {
    try {
        const order = await SalesOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Sales order not found' });
        if (!['Draft', 'Confirmed'].includes(order.status)) return res.status(400).json({ error: 'Cannot edit this order' });

        Object.assign(order, req.body);
        await order.save();
        res.json({ success: true, data: order, message: 'Sales order updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.confirmOrder = async (req, res) => {
    try {
        const order = await SalesOrder.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Sales order not found' });
        if (order.status !== 'Draft') return res.status(400).json({ error: 'Only draft orders can be confirmed' });

        order.status = 'Confirmed';
        await order.save();
        res.json({ success: true, data: order, message: 'Order confirmed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.assignOrder = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const { assigned_to, priority } = req.body;

        const update = {};
        if (assigned_to !== undefined) update.assigned_to = assigned_to || null;
        if (priority !== undefined) update.priority = priority;

        const order = await SalesOrder.findByIdAndUpdate(id, { $set: update }, { new: true })
            .populate('assigned_to', 'first_name last_name email');
        if (!order) return res.status(404).json({ error: 'Sales order not found' });

        await AuditLog.create({
            user_id: req.user.userId, company_id: companyId, entity_type: 'SalesOrder', entity_id: order._id,
            action: 'Assign', new_values: update, ip_address: req.ip, timestamp: new Date(),
        });

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.convertToInvoice = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const order = await SalesOrder.findById(id);
        if (!order) return res.status(404).json({ error: 'Sales order not found' });
        if (!['Confirmed', 'Processing', 'Shipped', 'Delivered'].includes(order.status)) {
            return res.status(400).json({ error: 'Order must be confirmed before invoicing' });
        }

        const invoice_number = await generateDocumentNumber(Invoice, 'INV', 'invoice_number', companyId);
        const due_date = new Date();
        due_date.setDate(due_date.getDate() + 30);

        const invoice = await Invoice.create({
            company_id: companyId,
            invoice_number,
            customer_id: order.customer_id,
            sales_order_id: order._id,
            invoice_date: new Date(),
            due_date,
            line_items: order.line_items,
            subtotal: order.subtotal,
            tax_amount: order.tax_amount,
            total_amount: order.total_amount,
            amount_due: order.total_amount,
            currency: order.currency,
            created_by: req.user.userId,
        });

        order.status = 'Invoiced';
        await order.save();

        res.status(201).json({ success: true, data: invoice, message: 'Invoice created from sales order' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
