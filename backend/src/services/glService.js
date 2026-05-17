const JournalEntry = require('../models/JournalEntry');
const GLBalance = require('../models/GLBalance');
const ChartOfAccounts = require('../models/ChartOfAccounts');

const findAccount = (companyId, query) =>
    ChartOfAccounts.findOne({ company_id: companyId, allow_posting: true, is_active: true, ...query });

const updateGLBalance = async (accountId, companyId, debit, credit) => {
    const now = new Date();
    await GLBalance.findOneAndUpdate(
        {
            account_id: accountId,
            company_id: companyId,
            fiscal_year: now.getFullYear(),
            fiscal_period: now.getMonth() + 1,
        },
        { $inc: { debit_balance: debit, credit_balance: credit } },
        { upsert: true, new: true }
    );
};

exports.postInvoiceGLEntries = async (invoice, companyId) => {
    const [arAccount, incomeAccount, taxAccount] = await Promise.all([
        findAccount(companyId, { account_type: 'Asset', account_name: /Accounts Receivable/i }),
        findAccount(companyId, { account_type: 'Income', account_name: /Sales/i }),
        findAccount(companyId, { account_name: /Sales Tax Payable/i }),
    ]);

    if (!arAccount || !incomeAccount) {
        throw new Error('Required GL accounts (AR, Sales Income) not configured');
    }

    const total = parseFloat(invoice.total_amount?.toString() || 0);
    const subtotal = parseFloat(invoice.subtotal?.toString() || 0);
    const taxAmt = parseFloat(invoice.tax_amount?.toString() || 0);

    const lines = [
        { account_id: arAccount._id, debit_amount: total, credit_amount: 0, description: `AR - ${invoice.invoice_number}` },
        { account_id: incomeAccount._id, debit_amount: 0, credit_amount: subtotal, description: `Sales - ${invoice.invoice_number}` },
    ];

    if (taxAmt > 0 && taxAccount) {
        lines.push({ account_id: taxAccount._id, debit_amount: 0, credit_amount: taxAmt, description: `Tax - ${invoice.invoice_number}` });
    }

    const entry = await JournalEntry.create({
        company_id: companyId,
        journal_date: invoice.invoice_date,
        reference_number: invoice.invoice_number,
        description: `Invoice ${invoice.invoice_number}`,
        source_type: 'Invoice',
        source_id: invoice._id,
        status: 'Posted',
        lines,
        posted_at: new Date(),
    });

    for (const line of lines) {
        await updateGLBalance(line.account_id, companyId, line.debit_amount, line.credit_amount);
    }

    return entry;
};

exports.postPaymentGLEntries = async (payment, companyId) => {
    const isCustomer = payment.payment_type === 'Customer Payment';

    const [cashAccount, arOrApAccount] = await Promise.all([
        findAccount(companyId, { account_type: 'Asset', account_name: /Bank|Cash/i }),
        isCustomer
            ? findAccount(companyId, { account_type: 'Asset', account_name: /Accounts Receivable/i })
            : findAccount(companyId, { account_type: 'Liability', account_name: /Accounts Payable/i }),
    ]);

    if (!cashAccount || !arOrApAccount) {
        throw new Error('Required GL accounts not configured for payment');
    }

    const amount = parseFloat(payment.amount?.toString() || 0);

    const lines = isCustomer
        ? [
            { account_id: cashAccount._id, debit_amount: amount, credit_amount: 0, description: `Payment - ${payment.reference_number}` },
            { account_id: arOrApAccount._id, debit_amount: 0, credit_amount: amount, description: `Payment - ${payment.reference_number}` },
          ]
        : [
            { account_id: arOrApAccount._id, debit_amount: amount, credit_amount: 0, description: `Payment - ${payment.reference_number}` },
            { account_id: cashAccount._id, debit_amount: 0, credit_amount: amount, description: `Payment - ${payment.reference_number}` },
          ];

    const entry = await JournalEntry.create({
        company_id: companyId,
        journal_date: payment.payment_date,
        reference_number: payment.reference_number,
        description: `Payment ${payment.reference_number}`,
        source_type: 'Payment',
        source_id: payment._id,
        status: 'Posted',
        lines,
        posted_at: new Date(),
    });

    for (const line of lines) {
        await updateGLBalance(line.account_id, companyId, line.debit_amount, line.credit_amount);
    }

    return entry;
};

exports.postPurchaseInvoiceGLEntries = async (bill, companyId) => {
    const [apAccount, expenseAccount] = await Promise.all([
        findAccount(companyId, { account_type: 'Liability', account_name: /Accounts Payable/i }),
        findAccount(companyId, { account_type: 'Expense', account_name: /Purchase|Cost of Goods/i }),
    ]);

    if (!apAccount || !expenseAccount) {
        throw new Error('Required GL accounts (AP, Expense) not configured');
    }

    const total = parseFloat(bill.total_amount?.toString() || 0);
    const subtotal = parseFloat(bill.subtotal?.toString() || 0);

    const lines = [
        { account_id: expenseAccount._id, debit_amount: subtotal, credit_amount: 0, description: `Purchase - ${bill.invoice_number}` },
        { account_id: apAccount._id, debit_amount: 0, credit_amount: total, description: `AP - ${bill.invoice_number}` },
    ];

    const entry = await JournalEntry.create({
        company_id: companyId,
        journal_date: bill.invoice_date,
        reference_number: bill.invoice_number,
        description: `Purchase Invoice ${bill.invoice_number}`,
        source_type: 'PurchaseInvoice',
        source_id: bill._id,
        status: 'Posted',
        lines,
        posted_at: new Date(),
    });

    for (const line of lines) {
        await updateGLBalance(line.account_id, companyId, line.debit_amount, line.credit_amount);
    }

    return entry;
};
