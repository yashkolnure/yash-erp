const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');

exports.createCustomer = async (req, res) => {
    try {
        const { companyId } = req.params;
        const count = await Customer.countDocuments({ company_id: companyId });
        const customer_code = req.body.customer_code || `CUST-${String(count + 1).padStart(5, '0')}`;

        const customer = await Customer.create({ ...req.body, company_id: companyId, customer_code });

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'Customer', entity_id: customer._id, action: 'Create', new_values: customer.toObject(), ip_address: req.ip, timestamp: new Date() });

        res.status(201).json({ success: true, data: customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCustomer = async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json({ success: true, data: customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listCustomers = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { search, status, skip = 0, limit = 20 } = req.query;

        const filter = { company_id: companyId, is_active: true };
        if (status) filter.customer_status = status;
        if (search) filter.$text = { $search: search };

        const [customers, total] = await Promise.all([
            Customer.find(filter).sort({ customer_name: 1 }).skip(+skip).limit(+limit),
            Customer.countDocuments(filter),
        ]);

        res.json({ success: true, data: customers, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, { ...req.body, updated_at: new Date() }, { new: true, runValidators: true });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json({ success: true, data: customer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndUpdate(req.params.id, { is_active: false, customer_status: 'Inactive' }, { new: true });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        res.json({ success: true, message: 'Customer deactivated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCustomerStatement = async (req, res) => {
    try {
        const { companyId, customerId } = req.params;
        const { from_date, to_date } = req.query;

        const dateFilter = {};
        if (from_date) dateFilter.$gte = new Date(from_date);
        if (to_date) dateFilter.$lte = new Date(to_date);

        const Invoice = require('../models/Invoice');
        const Payment = require('../models/Payment');
        const CreditNote = require('../models/CreditNote');

        const [invoices, payments, creditNotes, customer] = await Promise.all([
            Invoice.find({ company_id: companyId, customer_id: customerId, status: { $ne: 'Cancelled' }, ...(from_date || to_date ? { invoice_date: dateFilter } : {}) }).sort({ invoice_date: 1 }),
            Payment.find({ company_id: companyId, party_id: customerId, payment_type: 'Customer Payment', ...(from_date || to_date ? { payment_date: dateFilter } : {}) }).sort({ payment_date: 1 }),
            CreditNote.find({ company_id: companyId, customer_id: customerId, status: { $ne: 'Void' }, ...(from_date || to_date ? { credit_note_date: dateFilter } : {}) }).sort({ credit_note_date: 1 }),
            Customer.findById(customerId),
        ]);

        // Build unified timeline
        const transactions = [
            ...invoices.map(i => ({ date: i.invoice_date, type: 'Invoice', reference: i.invoice_number, description: `Invoice ${i.invoice_number}`, debit: parseFloat(i.total_amount?.toString() || 0), credit: 0, balance: 0 })),
            ...payments.map(p => ({ date: p.payment_date, type: 'Payment', reference: p.reference_number || p.payment_method, description: 'Payment received', debit: 0, credit: parseFloat(p.amount?.toString() || 0), balance: 0 })),
            ...creditNotes.map(c => ({ date: c.credit_note_date || c.created_at, type: 'Credit Note', reference: c.credit_note_number, description: `Credit Note ${c.credit_note_number}`, debit: 0, credit: parseFloat(c.total_amount?.toString() || 0), balance: 0 })),
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance
        let balance = 0;
        transactions.forEach(t => { balance += t.debit - t.credit; t.balance = balance; });

        res.json({ success: true, data: { customer, transactions, closing_balance: balance } });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
