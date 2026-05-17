const Payment = require('../models/Payment');
const PaymentApplication = require('../models/PaymentApplication');
const Invoice = require('../models/Invoice');
const PurchaseInvoice = require('../models/PurchaseInvoice');
const AuditLog = require('../models/AuditLog');
const { postPaymentGLEntries } = require('../services/glService');
const { generateDocumentNumber } = require('../utils/helpers');

exports.recordPayment = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { payment_type, party_id, payment_date, payment_method, amount, currency, reference_number, bank_account, notes } = req.body;

        const payment = await Payment.create({
            company_id: companyId,
            payment_type,
            party_id,
            party_model: payment_type === 'Customer Payment' ? 'Customer' : 'Vendor',
            payment_date: payment_date || new Date(),
            payment_method,
            amount,
            currency: currency || 'USD',
            reference_number: reference_number || `PAY-${Date.now()}`,
            bank_account,
            notes,
            created_by: req.user.userId,
        });

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'Payment', entity_id: payment._id, action: 'Create', new_values: payment.toObject(), ip_address: req.ip, timestamp: new Date() });

        res.status(201).json({ success: true, data: payment, message: 'Payment recorded' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.applyPayment = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { payment_id, applications } = req.body;

        const payment = await Payment.findById(payment_id);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        if (payment.is_applied) return res.status(400).json({ error: 'Payment already fully applied' });

        const paymentAmount = parseFloat(payment.amount?.toString() || 0);
        let totalApplied = 0;

        for (const app of applications) {
            const isCustomer = payment.payment_type === 'Customer Payment';
            const InvoiceModel = isCustomer ? Invoice : PurchaseInvoice;

            const invoice = await InvoiceModel.findById(app.invoice_id);
            if (!invoice) return res.status(404).json({ error: `Invoice ${app.invoice_id} not found` });

            const amountDue = parseFloat(invoice.amount_due?.toString() || 0);
            const appliedAmount = parseFloat(app.applied_amount);

            if (appliedAmount > amountDue) {
                return res.status(400).json({ error: `Applied amount exceeds due amount for invoice ${invoice.invoice_number}` });
            }

            await PaymentApplication.create({
                company_id: companyId,
                payment_id,
                invoice_id: invoice._id,
                invoice_model: isCustomer ? 'Invoice' : 'PurchaseInvoice',
                applied_amount: appliedAmount,
                created_by: req.user.userId,
            });

            // Update invoice balances
            const newAmountPaid = parseFloat(invoice.amount_paid?.toString() || 0) + appliedAmount;
            const newAmountDue = parseFloat(invoice.total_amount?.toString() || 0) - newAmountPaid;

            invoice.amount_paid = newAmountPaid;
            invoice.amount_due = newAmountDue;
            invoice.status = newAmountDue <= 0.01 ? 'Paid' : 'Partially Paid';
            await invoice.save();

            totalApplied += appliedAmount;
        }

        if (Math.abs(totalApplied - paymentAmount) > 0.01) {
            return res.status(400).json({ error: `Applied amount (${totalApplied}) does not match payment amount (${paymentAmount})` });
        }

        payment.is_applied = true;
        await payment.save();

        // Post GL entries
        await postPaymentGLEntries(payment, companyId);

        res.json({ success: true, message: 'Payment applied and GL posted', total_applied: totalApplied });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listPayments = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { payment_type, from_date, to_date, skip = 0, limit = 20 } = req.query;

        const filter = { company_id: companyId };
        if (payment_type) filter.payment_type = payment_type;
        if (from_date || to_date) {
            filter.payment_date = {};
            if (from_date) filter.payment_date.$gte = new Date(from_date);
            if (to_date) filter.payment_date.$lte = new Date(to_date);
        }

        const [payments, total] = await Promise.all([
            Payment.find(filter).sort({ payment_date: -1 }).skip(+skip).limit(+limit),
            Payment.countDocuments(filter),
        ]);

        res.json({ success: true, data: payments, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPaymentApplications = async (req, res) => {
    try {
        const applications = await PaymentApplication.find({ payment_id: req.params.id });
        res.json({ success: true, data: applications });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDashboard = async (req, res) => {
    try {
        const { companyId } = req.params;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [customerPayments, vendorPayments] = await Promise.all([
            Payment.aggregate([
                { $match: { company_id: companyId, payment_type: 'Customer Payment', payment_date: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } }, count: { $sum: 1 } } },
            ]),
            Payment.aggregate([
                { $match: { company_id: companyId, payment_type: 'Vendor Payment', payment_date: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } }, count: { $sum: 1 } } },
            ]),
        ]);

        res.json({
            success: true,
            data: {
                customer_payments_this_month: { total: customerPayments[0]?.total || 0, count: customerPayments[0]?.count || 0 },
                vendor_payments_this_month: { total: vendorPayments[0]?.total || 0, count: vendorPayments[0]?.count || 0 },
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
