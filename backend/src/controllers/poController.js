const PurchaseOrder = require('../models/PurchaseOrder');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const GoodsReceiptNote = require('../models/GoodsReceiptNote');
const Vendor = require('../models/Vendor');
const StockBalance = require('../models/StockBalance');
const AuditLog = require('../models/AuditLog');
const { generateDocumentNumber, calculateLineItems } = require('../utils/helpers');
const { postPurchaseInvoiceGLEntries } = require('../services/glService');

exports.createPO = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { vendor_id, po_date, required_date, line_items, notes, currency, assigned_to, priority } = req.body;

        if (!vendor_id || !line_items?.length) {
            return res.status(400).json({ error: 'vendor_id and at least one line item are required' });
        }

        const vendor = await Vendor.findById(vendor_id);
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

        const po_number = await generateDocumentNumber(PurchaseOrder, 'PO', 'po_number', companyId);
        const { line_items: calculatedItems, subtotal, tax_amount } = calculateLineItems(line_items || []);

        const po = await PurchaseOrder.create({
            company_id: companyId,
            po_number,
            vendor_id,
            po_date: po_date || new Date(),
            required_date,
            line_items: calculatedItems,
            subtotal,
            tax_amount,
            total_amount: subtotal + tax_amount,
            currency: currency || 'USD',
            notes,
            assigned_to: assigned_to || null,
            priority: priority || 'Normal',
            created_by: req.user.userId,
        });

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'PurchaseOrder', entity_id: po._id, action: 'Create', new_values: po.toObject(), ip_address: req.ip, timestamp: new Date() });

        res.status(201).json({ success: true, data: po, message: 'Purchase order created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPO = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id).populate('vendor_id');
        if (!po) return res.status(404).json({ error: 'Purchase order not found' });
        res.json({ success: true, data: po });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listPOs = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, vendor_id, skip = 0, limit = 20 } = req.query;

        const filter = { company_id: companyId };
        if (status) filter.status = status;
        if (vendor_id) filter.vendor_id = vendor_id;

        const [pos, total] = await Promise.all([
            PurchaseOrder.find(filter).populate('vendor_id', 'vendor_name').populate('assigned_to', 'first_name last_name email').sort({ po_date: -1 }).skip(+skip).limit(+limit),
            PurchaseOrder.countDocuments(filter),
        ]);

        res.json({ success: true, data: pos, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.assignPO = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const { assigned_to, priority } = req.body;

        const update = {};
        if (assigned_to !== undefined) update.assigned_to = assigned_to || null;
        if (priority !== undefined) update.priority = priority;

        const po = await PurchaseOrder.findByIdAndUpdate(id, { $set: update }, { new: true })
            .populate('assigned_to', 'first_name last_name email');
        if (!po) return res.status(404).json({ error: 'PO not found' });

        await AuditLog.create({
            user_id: req.user.userId, company_id: companyId, entity_type: 'PurchaseOrder', entity_id: po._id,
            action: 'Assign', new_values: update, ip_address: req.ip, timestamp: new Date(),
        });

        res.json({ success: true, data: po });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.confirmPO = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (!po) return res.status(404).json({ error: 'PO not found' });
        if (po.status !== 'Draft') return res.status(400).json({ error: 'Only draft POs can be confirmed' });

        po.status = 'Confirmed';
        await po.save();
        res.json({ success: true, data: po, message: 'PO confirmed' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createGRN = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { purchase_order_id, warehouse_id, receipt_date, line_items, notes } = req.body;

        if (!purchase_order_id || !warehouse_id || !line_items?.length) {
            return res.status(400).json({ error: 'purchase_order_id, warehouse_id and at least one line item are required' });
        }

        const po = await PurchaseOrder.findById(purchase_order_id);
        if (!po) return res.status(404).json({ error: 'PO not found' });

        const grn_number = await generateDocumentNumber(GoodsReceiptNote, 'GRN', 'grn_number', companyId);

        const grn = await GoodsReceiptNote.create({
            company_id: companyId,
            grn_number,
            purchase_order_id,
            vendor_id: po.vendor_id,
            receipt_date: receipt_date || new Date(),
            warehouse_id,
            line_items,
            notes,
            status: 'Received',
            created_by: req.user.userId,
        });

        // Update stock for accepted items
        for (const item of line_items) {
            if (item.quantity_accepted > 0) {
                await StockBalance.findOneAndUpdate(
                    { product_id: item.product_id, warehouse_id },
                    { $inc: { quantity_on_hand: item.quantity_accepted } },
                    { upsert: true, new: true }
                );
            }

            // Update PO line received qty
            const poLine = po.line_items.find(l => l.product_id?.toString() === item.product_id?.toString());
            if (poLine) {
                poLine.quantity_received = (poLine.quantity_received || 0) + item.quantity_received;
            }
        }

        const allReceived = po.line_items.every(l => (l.quantity_received || 0) >= l.quantity_ordered);
        po.status = allReceived ? 'Received Complete' : 'Received Partial';
        await po.save();

        res.status(201).json({ success: true, data: grn, message: 'Goods received' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.duplicatePO = async (req, res) => {
    try {
        const { companyId } = req.params;
        const original = await PurchaseOrder.findById(req.params.id).lean();
        if (!original) return res.status(404).json({ error: 'Not found' });
        const count = await PurchaseOrder.countDocuments({ company_id: companyId });
        const year = new Date().getFullYear();
        const { _id, po_number, status, createdAt, updatedAt, __v, ...rest } = original;
        const clone = await PurchaseOrder.create({
            ...rest,
            company_id: companyId,
            po_number: `PO-${year}-${String(count + 1).padStart(5, '0')}`,
            status: 'Draft',
            po_date: new Date(),
        });
        res.status(201).json({ success: true, data: clone });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createVendor = async (req, res) => {
    try {
        const { companyId } = req.params;
        const count = await Vendor.countDocuments({ company_id: companyId });
        const vendor_code = req.body.vendor_code || `VEN-${String(count + 1).padStart(5, '0')}`;

        const vendor = await Vendor.create({ ...req.body, company_id: companyId, vendor_code });
        res.status(201).json({ success: true, data: vendor });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listVendors = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { search, skip = 0, limit = 20 } = req.query;

        const filter = { company_id: companyId, is_active: true };
        if (search) filter.$text = { $search: search };

        const [vendors, total] = await Promise.all([
            Vendor.find(filter).sort({ vendor_name: 1 }).skip(+skip).limit(+limit),
            Vendor.countDocuments(filter),
        ]);

        res.json({ success: true, data: vendors, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listPurchaseInvoices = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, vendor_id, skip = 0, limit = 20 } = req.query;
        const filter = { company_id: companyId };
        if (status) filter.status = status;
        if (vendor_id) filter.vendor_id = vendor_id;
        const [bills, total] = await Promise.all([
            PurchaseInvoice.find(filter).populate('vendor_id', 'vendor_name').sort({ invoice_date: -1 }).skip(+skip).limit(+limit),
            PurchaseInvoice.countDocuments(filter),
        ]);
        res.json({ success: true, data: bills, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getPurchaseInvoice = async (req, res) => {
    try {
        const bill = await PurchaseInvoice.findById(req.params.id).populate('vendor_id').populate('purchase_order_id', 'po_number');
        if (!bill) return res.status(404).json({ error: 'Bill not found' });
        res.json({ success: true, data: bill });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listGRNs = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { purchase_order_id, skip = 0, limit = 20 } = req.query;
        const filter = { company_id: companyId };
        if (purchase_order_id) filter.purchase_order_id = purchase_order_id;
        const [grns, total] = await Promise.all([
            GoodsReceiptNote.find(filter).populate('vendor_id', 'vendor_name').populate('purchase_order_id', 'po_number').populate('warehouse_id', 'warehouse_name').sort({ receipt_date: -1 }).skip(+skip).limit(+limit),
            GoodsReceiptNote.countDocuments(filter),
        ]);
        res.json({ success: true, data: grns, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createPurchaseInvoice = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { vendor_id, purchase_order_id, invoice_number, invoice_date, due_date, line_items, notes } = req.body;

        const { line_items: calculatedItems, subtotal, tax_amount } = calculateLineItems(line_items || []);
        const total_amount = subtotal + tax_amount;

        const bill = await PurchaseInvoice.create({
            company_id: companyId,
            invoice_number,
            vendor_id,
            purchase_order_id,
            invoice_date,
            due_date,
            line_items: calculatedItems,
            subtotal,
            tax_amount,
            total_amount,
            amount_due: total_amount,
            created_by: req.user.userId,
        });

        res.status(201).json({ success: true, data: bill });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.postPurchaseInvoice = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const bill = await PurchaseInvoice.findById(id);
        if (!bill) return res.status(404).json({ error: 'Bill not found' });
        if (bill.status !== 'Draft') return res.status(400).json({ error: 'Only draft bills can be posted' });

        // 3-way matching: check GRN received quantities against billed quantities
        if (bill.purchase_order_id) {
            const grns = await GoodsReceiptNote.find({
                purchase_order_id: bill.purchase_order_id,
                company_id: bill.company_id,
            });
            const receivedQty = {};
            grns.forEach(grn => {
                (grn.line_items || []).forEach(l => {
                    const pid = String(l.product_id);
                    receivedQty[pid] = (receivedQty[pid] || 0) + (l.quantity_accepted || 0);
                });
            });
            // Check each bill line doesn't exceed received qty
            for (const line of (bill.line_items || [])) {
                if (line.product_id) {
                    const received = receivedQty[String(line.product_id)] || 0;
                    const billed = parseFloat(line.quantity || 0);
                    if (billed > received) {
                        return res.status(400).json({
                            error: `3-way match failed: billed quantity (${billed}) exceeds received quantity (${received}) for a line item. Receive goods first.`,
                            matching_error: true,
                        });
                    }
                }
            }
        }

        await postPurchaseInvoiceGLEntries(bill, companyId);

        bill.status = 'Posted';
        bill.posted_by = req.user.userId;
        bill.posted_at = new Date();
        bill.amount_due = bill.total_amount;
        await bill.save();

        res.json({ success: true, data: bill, message: 'Bill posted to GL' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/* ── Vendor Statement ───────────────────────────────────────────────────── */
exports.getVendorStatement = async (req, res) => {
    try {
        const { companyId, id: vendorId } = req.params;
        const { date_from, date_to } = req.query;

        const Payment = require('../models/Payment');
        const DebitNote = require('../models/DebitNote');

        const dateFilter = {};
        if (date_from) dateFilter.$gte = new Date(date_from);
        if (date_to) dateFilter.$lte = new Date(date_to);
        const hasDateFilter = date_from || date_to;

        const [bills, payments, debitNotes, vendor] = await Promise.all([
            PurchaseInvoice.find({
                company_id: companyId,
                vendor_id: vendorId,
                status: { $ne: 'Cancelled' },
                ...(hasDateFilter ? { bill_date: dateFilter } : {}),
            }).sort({ bill_date: 1 }),
            Payment.find({
                company_id: companyId,
                party_id: vendorId,
                payment_type: 'Vendor Payment',
                ...(hasDateFilter ? { payment_date: dateFilter } : {}),
            }).sort({ payment_date: 1 }),
            DebitNote.find({
                company_id: companyId,
                vendor_id: vendorId,
                status: { $ne: 'Void' },
                ...(hasDateFilter ? { debit_note_date: dateFilter } : {}),
            }).sort({ debit_note_date: 1 }),
            Vendor.findById(vendorId),
        ]);

        // Build unified timeline
        const transactions = [
            ...bills.map(b => ({
                date: b.bill_date || b.invoice_date,
                type: 'Bill',
                reference: b.bill_number || b.invoice_number,
                description: `Purchase Bill ${b.bill_number || b.invoice_number}`,
                debit: parseFloat(b.total_amount?.toString() || 0),
                credit: 0,
                balance: 0,
            })),
            ...payments.map(p => ({
                date: p.payment_date,
                type: 'Payment',
                reference: p.reference_number || p.payment_method,
                description: 'Vendor payment made',
                debit: 0,
                credit: parseFloat(p.amount?.toString() || 0),
                balance: 0,
            })),
            ...debitNotes.map(d => ({
                date: d.debit_note_date || d.created_at,
                type: 'Debit Note',
                reference: d.debit_note_number,
                description: `Debit Note ${d.debit_note_number}`,
                debit: 0,
                credit: parseFloat(d.total_amount?.toString() || 0),
                balance: 0,
            })),
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance (debit = owe more, credit = owe less)
        let balance = 0;
        transactions.forEach(t => { balance += t.debit - t.credit; t.balance = balance; });

        res.json({
            success: true,
            data: { vendor, date_from, date_to, opening_balance: 0, transactions, closing_balance: balance },
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
