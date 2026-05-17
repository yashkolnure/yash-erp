const CreditNote = require('../models/CreditNote');
const Invoice = require('../models/Invoice');
const AuditLog = require('../models/AuditLog');
const { generateDocumentNumber, calculateLineItems } = require('../utils/helpers');

exports.createCreditNote = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { invoice_id, customer_id, credit_note_date, reason, line_items, notes, currency } = req.body;

        const credit_note_number = await generateDocumentNumber(CreditNote, 'CN', 'credit_note_number', companyId);
        const { line_items: calc, subtotal, tax_amount } = calculateLineItems(line_items || []);
        const total_amount = subtotal + tax_amount;

        const cn = await CreditNote.create({
            company_id: companyId, credit_note_number,
            invoice_id: invoice_id || null, customer_id,
            credit_note_date: credit_note_date || new Date(),
            reason, line_items: calc, subtotal, tax_amount,
            total_amount, amount_remaining: total_amount,
            currency: currency || 'USD', notes, created_by: req.user.userId,
        });

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'CreditNote', entity_id: cn._id, action: 'Create', new_values: cn.toObject(), ip_address: req.ip, timestamp: new Date() });

        res.status(201).json({ success: true, data: cn, message: 'Credit note created' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listCreditNotes = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, customer_id, skip = 0, limit = 20 } = req.query;
        const filter = { company_id: companyId };
        if (status) filter.status = status;
        if (customer_id) filter.customer_id = customer_id;
        const [cns, total] = await Promise.all([
            CreditNote.find(filter).populate('customer_id', 'customer_name email').populate('invoice_id', 'invoice_number').sort({ credit_note_date: -1 }).skip(+skip).limit(+limit),
            CreditNote.countDocuments(filter),
        ]);
        res.json({ success: true, data: cns, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getCreditNote = async (req, res) => {
    try {
        const cn = await CreditNote.findById(req.params.id).populate('customer_id').populate('invoice_id', 'invoice_number total_amount');
        if (!cn) return res.status(404).json({ error: 'Credit note not found' });
        res.json({ success: true, data: cn });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.postCreditNote = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const cn = await CreditNote.findById(id);
        if (!cn) return res.status(404).json({ error: 'Credit note not found' });
        if (cn.status !== 'Draft') return res.status(400).json({ error: 'Only draft credit notes can be posted' });

        cn.status = 'Posted';
        cn.posted_by = req.user.userId;
        cn.posted_at = new Date();
        await cn.save();

        // If linked to invoice, reduce the amount_due on the invoice
        if (cn.invoice_id) {
            const inv = await Invoice.findById(cn.invoice_id);
            if (inv) {
                const reduction = Math.min(parseFloat(cn.total_amount.toString()), parseFloat(inv.amount_due.toString()));
                inv.amount_due = Math.max(0, parseFloat(inv.amount_due.toString()) - reduction);
                cn.amount_applied = reduction;
                cn.amount_remaining = parseFloat(cn.total_amount.toString()) - reduction;
                if (parseFloat(inv.amount_due.toString()) === 0) inv.status = 'Paid';
                await inv.save();
                await cn.save();
            }
        }

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'CreditNote', entity_id: cn._id, action: 'Post', ip_address: req.ip, timestamp: new Date() });

        res.json({ success: true, data: cn, message: 'Credit note posted' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.voidCreditNote = async (req, res) => {
    try {
        const cn = await CreditNote.findById(req.params.id);
        if (!cn) return res.status(404).json({ error: 'Credit note not found' });
        if (cn.status === 'Applied') return res.status(400).json({ error: 'Cannot void an applied credit note' });
        cn.status = 'Void';
        await cn.save();
        res.json({ success: true, data: cn });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
