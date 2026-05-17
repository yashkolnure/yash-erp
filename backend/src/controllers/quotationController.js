const Quotation = require('../models/Quotation');
const SalesOrder = require('../models/SalesOrder');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const { generateDocumentNumber, calculateLineItems } = require('../utils/helpers');

exports.createQuotation = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { customer_id, quotation_date, expiry_date, line_items, notes, terms_conditions, currency, assigned_to, priority, lead_id } = req.body;

        const customer = await Customer.findById(customer_id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const quotation_number = await generateDocumentNumber(Quotation, 'QT', 'quotation_number', companyId);
        const { line_items: calculatedItems, subtotal, tax_amount } = calculateLineItems(line_items || []);
        const total_amount = subtotal + tax_amount;

        const quotation = await Quotation.create({
            company_id: companyId, quotation_number, customer_id,
            quotation_date: quotation_date || new Date(),
            expiry_date, line_items: calculatedItems,
            subtotal, tax_amount, total_amount,
            currency: currency || 'USD', notes, terms_conditions,
            assigned_to: assigned_to || null, priority: priority || 'Normal',
            lead_id: lead_id || null, created_by: req.user.userId,
        });

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'Quotation', entity_id: quotation._id, action: 'Create', new_values: quotation.toObject(), ip_address: req.ip, timestamp: new Date() });

        res.status(201).json({ success: true, data: quotation, message: 'Quotation created' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listQuotations = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, customer_id, skip = 0, limit = 20 } = req.query;
        const filter = { company_id: companyId };
        if (status) filter.status = status;
        if (customer_id) filter.customer_id = customer_id;
        const [quotations, total] = await Promise.all([
            Quotation.find(filter).populate('customer_id', 'customer_name email').populate('assigned_to', 'first_name last_name').sort({ quotation_date: -1 }).skip(+skip).limit(+limit),
            Quotation.countDocuments(filter),
        ]);
        res.json({ success: true, data: quotations, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getQuotation = async (req, res) => {
    try {
        const q = await Quotation.findById(req.params.id).populate('customer_id').populate('assigned_to', 'first_name last_name email');
        if (!q) return res.status(404).json({ error: 'Quotation not found' });
        res.json({ success: true, data: q });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateQuotation = async (req, res) => {
    try {
        const q = await Quotation.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Quotation not found' });
        if (!['Draft', 'Sent'].includes(q.status)) return res.status(400).json({ error: 'Cannot edit this quotation' });

        const { line_items, ...rest } = req.body;
        if (line_items) {
            const { line_items: calc, subtotal, tax_amount } = calculateLineItems(line_items);
            q.line_items = calc; q.subtotal = subtotal; q.tax_amount = tax_amount; q.total_amount = subtotal + tax_amount;
        }
        Object.assign(q, rest);
        await q.save();
        res.json({ success: true, data: q });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.sendQuotation = async (req, res) => {
    try {
        const q = await Quotation.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Quotation not found' });
        q.status = 'Sent';
        await q.save();
        await AuditLog.create({ user_id: req.user.userId, company_id: req.params.companyId, entity_type: 'Quotation', entity_id: q._id, action: 'Sent', ip_address: req.ip, timestamp: new Date() });
        res.json({ success: true, data: q, message: 'Quotation marked as sent' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.acceptQuotation = async (req, res) => {
    try {
        const q = await Quotation.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Quotation not found' });
        q.status = 'Accepted';
        await q.save();
        await AuditLog.create({ user_id: req.user.userId, company_id: req.params.companyId, entity_type: 'Quotation', entity_id: q._id, action: 'Accepted', ip_address: req.ip, timestamp: new Date() });
        res.json({ success: true, data: q });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.rejectQuotation = async (req, res) => {
    try {
        const q = await Quotation.findById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Quotation not found' });
        q.status = 'Rejected';
        await q.save();
        res.json({ success: true, data: q });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.convertToOrder = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const q = await Quotation.findById(id);
        if (!q) return res.status(404).json({ error: 'Quotation not found' });
        if (!['Accepted', 'Sent'].includes(q.status)) return res.status(400).json({ error: 'Only accepted/sent quotations can be converted' });

        const order_number = await generateDocumentNumber(SalesOrder, 'SO', 'order_number', companyId);
        const order = await SalesOrder.create({
            company_id: companyId, order_number,
            customer_id: q.customer_id, order_date: new Date(),
            line_items: q.line_items, subtotal: q.subtotal,
            tax_amount: q.tax_amount, total_amount: q.total_amount,
            currency: q.currency, notes: q.notes,
            assigned_to: q.assigned_to, created_by: req.user.userId,
        });

        q.status = 'Converted';
        q.converted_to_order_id = order._id;
        await q.save();

        res.status(201).json({ success: true, data: order, message: 'Quotation converted to sales order' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.duplicateQuotation = async (req, res) => {
    try {
        const { companyId } = req.params;
        const original = await Quotation.findById(req.params.id).lean();
        if (!original) return res.status(404).json({ error: 'Not found' });
        const count = await Quotation.countDocuments({ company_id: companyId });
        const year = new Date().getFullYear();
        const { _id, quotation_number, status, converted_to_order_id, createdAt, updatedAt, __v, ...rest } = original;
        const clone = await Quotation.create({
            ...rest,
            company_id: companyId,
            quotation_number: `QT-${year}-${String(count + 1).padStart(5, '0')}`,
            status: 'Draft',
            quotation_date: new Date(),
        });
        res.status(201).json({ success: true, data: clone });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.assignQuotation = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const { assigned_to, priority } = req.body;
        const update = {};
        if (assigned_to !== undefined) update.assigned_to = assigned_to || null;
        if (priority !== undefined) update.priority = priority;
        const q = await Quotation.findByIdAndUpdate(id, { $set: update }, { new: true }).populate('assigned_to', 'first_name last_name email');
        if (!q) return res.status(404).json({ error: 'Quotation not found' });
        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'Quotation', entity_id: q._id, action: 'Assign', new_values: update, ip_address: req.ip, timestamp: new Date() });
        res.json({ success: true, data: q });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
