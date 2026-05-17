const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const AuditLog = require('../models/AuditLog');
const { postInvoiceGLEntries } = require('../services/glService');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const { generateDocumentNumber, calculateLineItems } = require('../utils/helpers');

exports.createInvoice = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { customer_id, invoice_date, due_date, line_items, notes, currency, sales_order_id, assigned_to, priority, bank_account_id } = req.body;

        if (!customer_id || !line_items?.length || !due_date) {
            return res.status(400).json({ error: 'customer_id, due_date and at least one line item are required' });
        }

        const customer = await Customer.findById(customer_id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        // Credit limit check
        if (customer.credit_hold) {
            return res.status(400).json({ error: 'Customer is on credit hold. Cannot create invoice.' });
        }
        if (customer.credit_limit && parseFloat(customer.credit_limit.toString()) > 0) {
            const used = parseFloat((customer.credit_used || 0).toString());
            const limit = parseFloat(customer.credit_limit.toString());
            const { line_items: tempItems, subtotal: tempSubtotal, tax_amount: tempTax } = calculateLineItems(line_items || []);
            const invoiceTotal = tempSubtotal + tempTax;
            if (used + invoiceTotal > limit) {
                return res.status(400).json({
                    error: `Credit limit exceeded. Limit: ${limit}, Used: ${used}, New invoice: ${invoiceTotal}`,
                    credit_limit_exceeded: true,
                });
            }
        }

        const invoice_number = await generateDocumentNumber(Invoice, 'INV', 'invoice_number', companyId);
        const { line_items: calculatedItems, subtotal, tax_amount } = calculateLineItems(line_items || []);
        const total_amount = subtotal + tax_amount;

        const invoice = await Invoice.create({
            company_id: companyId,
            invoice_number,
            customer_id,
            sales_order_id,
            invoice_date,
            due_date,
            line_items: calculatedItems,
            subtotal,
            tax_amount,
            total_amount,
            amount_due: total_amount,
            currency: currency || 'USD',
            notes,
            assigned_to: assigned_to || null,
            priority: priority || 'Normal',
            bank_account_id: bank_account_id || null,
            created_by: req.user.userId,
        });

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'Invoice', entity_id: invoice._id, action: 'Create', new_values: invoice.toObject(), ip_address: req.ip, timestamp: new Date() });

        res.status(201).json({ success: true, data: invoice, message: 'Invoice created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate('customer_id').populate('sales_order_id');
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listInvoices = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { status, customer_id, skip = 0, limit = 20, from_date, to_date } = req.query;

        const filter = { company_id: companyId };
        if (status) filter.status = status;
        if (customer_id) filter.customer_id = customer_id;
        if (from_date || to_date) {
            filter.invoice_date = {};
            if (from_date) filter.invoice_date.$gte = new Date(from_date);
            if (to_date) filter.invoice_date.$lte = new Date(to_date);
        }

        const [invoices, total] = await Promise.all([
            Invoice.find(filter).populate('customer_id', 'customer_name email').populate('assigned_to', 'first_name last_name email').sort({ invoice_date: -1 }).skip(+skip).limit(+limit),
            Invoice.countDocuments(filter),
        ]);

        res.json({ success: true, data: invoices, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.status !== 'Draft') return res.status(400).json({ error: 'Only draft invoices can be edited' });

        const oldValues = invoice.toObject();
        const { line_items, ...rest } = req.body;

        if (line_items) {
            const { line_items: calculatedItems, subtotal, tax_amount } = calculateLineItems(line_items);
            invoice.line_items = calculatedItems;
            invoice.subtotal = subtotal;
            invoice.tax_amount = tax_amount;
            invoice.total_amount = subtotal + tax_amount;
            invoice.amount_due = subtotal + tax_amount;
        }

        Object.assign(invoice, rest);
        await invoice.save();

        await AuditLog.create({ user_id: req.user.userId, company_id: req.params.companyId, entity_type: 'Invoice', entity_id: invoice._id, action: 'Update', old_values: oldValues, new_values: invoice.toObject(), ip_address: req.ip, timestamp: new Date() });

        res.json({ success: true, data: invoice, message: 'Invoice updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.postInvoice = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const invoice = await Invoice.findById(id);

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.status !== 'Draft') return res.status(400).json({ error: 'Only draft invoices can be posted' });

        await postInvoiceGLEntries(invoice, companyId);

        invoice.status = 'Posted';
        invoice.posted_by = req.user.userId;
        invoice.posted_at = new Date();
        await invoice.save();

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'Invoice', entity_id: invoice._id, action: 'Post', new_values: invoice.toObject(), ip_address: req.ip, timestamp: new Date() });

        res.json({ success: true, data: invoice, message: 'Invoice posted to GL' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.cancelInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (['Paid', 'Cancelled'].includes(invoice.status)) return res.status(400).json({ error: `Cannot cancel ${invoice.status} invoice` });

        invoice.status = 'Cancelled';
        await invoice.save();

        res.json({ success: true, message: 'Invoice cancelled' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.emailInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate('customer_id');
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const pdf = await pdfService.generateInvoicePDF(invoice);
        await emailService.sendInvoiceEmail(invoice, pdf);

        res.json({ success: true, message: 'Invoice emailed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.downloadInvoicePDF = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate('customer_id');
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const pdf = await pdfService.generateInvoicePDF(invoice);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoice_number}.pdf`);
        res.send(pdf);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.assignInvoice = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const { assigned_to, priority } = req.body;

        const update = {};
        if (assigned_to !== undefined) update.assigned_to = assigned_to || null;
        if (priority !== undefined) update.priority = priority;

        const invoice = await Invoice.findByIdAndUpdate(id, { $set: update }, { new: true })
            .populate('assigned_to', 'first_name last_name email');
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        await AuditLog.create({
            user_id: req.user.userId, company_id: companyId, entity_type: 'Invoice', entity_id: invoice._id,
            action: 'Assign', new_values: update, ip_address: req.ip, timestamp: new Date(),
        });

        res.json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.duplicateInvoice = async (req, res) => {
    try {
        const { companyId } = req.params;
        const original = await Invoice.findById(req.params.id).lean();
        if (!original) return res.status(404).json({ error: 'Not found' });
        const count = await Invoice.countDocuments({ company_id: companyId });
        const year = new Date().getFullYear();
        const { _id, invoice_number, status, posted_at, createdAt, updatedAt, __v, ...rest } = original;
        const clone = await Invoice.create({
            ...rest,
            company_id: companyId,
            invoice_number: `INV-${year}-${String(count + 1).padStart(5, '0')}`,
            status: 'Draft',
            invoice_date: new Date(),
        });
        res.status(201).json({ success: true, data: clone });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.sendReminder = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate('customer_id');
        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (!['Posted', 'Partially Paid', 'Overdue'].includes(invoice.status)) {
            return res.status(400).json({ error: 'Can only send reminders for outstanding invoices' });
        }
        const customer = invoice.customer_id;
        const email = customer?.email;
        if (!email) return res.status(400).json({ error: 'Customer has no email address on file' });

        const { sendPaymentReminder } = require('../services/emailService');
        const result = await sendPaymentReminder({
            to: email,
            customerName: customer.customer_name,
            invoiceNumber: invoice.invoice_number,
            amountDue: invoice.amount_due || invoice.total_amount,
            dueDate: invoice.due_date,
            currency: invoice.currency || 'USD',
        });

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAgingReport = async (req, res) => {
    try {
        const { companyId } = req.params;
        const today = new Date();

        const invoices = await Invoice.find({
            company_id: companyId,
            status: { $in: ['Posted', 'Partially Paid', 'Overdue'] },
        }).populate('customer_id', 'customer_name');

        const buckets = { current: [], days_1_30: [], days_31_60: [], days_61_90: [], over_90: [] };

        for (const inv of invoices) {
            const daysOverdue = Math.floor((today - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
            const amountDue = parseFloat(inv.amount_due?.toString() || 0);

            const record = { invoice_number: inv.invoice_number, customer: inv.customer_id?.customer_name, due_date: inv.due_date, amount_due: amountDue, days_overdue: daysOverdue };

            if (daysOverdue <= 0) buckets.current.push(record);
            else if (daysOverdue <= 30) buckets.days_1_30.push(record);
            else if (daysOverdue <= 60) buckets.days_31_60.push(record);
            else if (daysOverdue <= 90) buckets.days_61_90.push(record);
            else buckets.over_90.push(record);
        }

        res.json({ success: true, data: buckets, as_of: today });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
