const DebitNote = require('../models/DebitNote');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const AuditLog = require('../models/AuditLog');
const { generateDocumentNumber, calculateLineItems } = require('../utils/helpers');

exports.createDebitNote = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { vendor_id, purchase_order_id, bill_id, debit_note_date, reason, line_items, notes, currency } = req.body;

        const debit_note_number = await generateDocumentNumber(DebitNote, 'DN', 'debit_note_number', companyId);
        const { line_items: calc, subtotal, tax_amount } = calculateLineItems(line_items || []);
        const total_amount = subtotal + tax_amount;

        const dn = await DebitNote.create({
            company_id: companyId, debit_note_number,
            vendor_id,
            purchase_order_id: purchase_order_id || null,
            bill_id: bill_id || null,
            debit_note_date: debit_note_date || new Date(),
            reason, line_items: calc, subtotal, tax_amount,
            total_amount, amount_remaining: total_amount,
            currency: currency || 'USD', notes, created_by: req.user.userId,
        });

        await AuditLog.create({
            user_id: req.user.userId, company_id: companyId,
            entity_type: 'DebitNote', entity_id: dn._id,
            action: 'Create', new_values: dn.toObject(),
            ip_address: req.ip, timestamp: new Date(),
        });

        res.status(201).json({ success: true, data: dn, message: 'Debit note created' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listDebitNotes = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, vendor_id, skip = 0, limit = 20 } = req.query;
        const filter = { company_id: companyId };
        if (status) filter.status = status;
        if (vendor_id) filter.vendor_id = vendor_id;
        const [dns, total] = await Promise.all([
            DebitNote.find(filter)
                .populate('vendor_id', 'vendor_name email')
                .populate('bill_id', 'invoice_number')
                .sort({ debit_note_date: -1 })
                .skip(+skip)
                .limit(+limit),
            DebitNote.countDocuments(filter),
        ]);
        res.json({ success: true, data: dns, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getDebitNote = async (req, res) => {
    try {
        const dn = await DebitNote.findById(req.params.id)
            .populate('vendor_id')
            .populate('purchase_order_id', 'po_number total_amount')
            .populate('bill_id', 'invoice_number total_amount');
        if (!dn) return res.status(404).json({ error: 'Debit note not found' });
        res.json({ success: true, data: dn });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.postDebitNote = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const dn = await DebitNote.findById(id);
        if (!dn) return res.status(404).json({ error: 'Debit note not found' });
        if (dn.status !== 'Draft') return res.status(400).json({ error: 'Only draft debit notes can be posted' });

        dn.status = 'Posted';
        dn.posted_by = req.user.userId;
        dn.posted_at = new Date();
        await dn.save();

        // If linked to a bill, reduce the amount_due on the bill
        if (dn.bill_id) {
            const bill = await PurchaseInvoice.findById(dn.bill_id);
            if (bill) {
                const reduction = Math.min(
                    parseFloat(dn.total_amount.toString()),
                    parseFloat(bill.amount_due?.toString() || '0')
                );
                bill.amount_due = Math.max(0, parseFloat(bill.amount_due?.toString() || '0') - reduction);
                dn.amount_applied = reduction;
                dn.amount_remaining = parseFloat(dn.total_amount.toString()) - reduction;
                if (parseFloat(bill.amount_due?.toString() || '0') === 0) bill.status = 'Paid';
                await bill.save();
                await dn.save();
            }
        }

        await AuditLog.create({
            user_id: req.user.userId, company_id: companyId,
            entity_type: 'DebitNote', entity_id: dn._id,
            action: 'Post', ip_address: req.ip, timestamp: new Date(),
        });

        res.json({ success: true, data: dn, message: 'Debit note posted' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.voidDebitNote = async (req, res) => {
    try {
        const dn = await DebitNote.findById(req.params.id);
        if (!dn) return res.status(404).json({ error: 'Debit note not found' });
        if (dn.status === 'Applied') return res.status(400).json({ error: 'Cannot void an applied debit note' });
        dn.status = 'Void';
        await dn.save();
        res.json({ success: true, data: dn });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
