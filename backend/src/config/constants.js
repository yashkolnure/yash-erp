module.exports = {
    PAGINATION: {
        DEFAULT_LIMIT: 20,
        MAX_LIMIT: 100,
    },

    DOCUMENT_TYPES: {
        INVOICE: 'Invoice',
        PURCHASE_INVOICE: 'PurchaseInvoice',
        PAYMENT: 'Payment',
        JOURNAL: 'JournalEntry',
        GOODS_RECEIPT: 'GoodsReceiptNote',
    },

    ACCOUNT_TYPES: {
        ASSET: 'Asset',
        LIABILITY: 'Liability',
        EQUITY: 'Equity',
        INCOME: 'Income',
        EXPENSE: 'Expense',
    },

    INVOICE_STATUS: {
        DRAFT: 'Draft',
        POSTED: 'Posted',
        PARTIALLY_PAID: 'Partially Paid',
        PAID: 'Paid',
        OVERDUE: 'Overdue',
        CANCELLED: 'Cancelled',
    },

    PO_STATUS: {
        DRAFT: 'Draft',
        CONFIRMED: 'Confirmed',
        RECEIVED_PARTIAL: 'Received Partial',
        RECEIVED_COMPLETE: 'Received Complete',
        INVOICED: 'Invoiced',
        CLOSED: 'Closed',
        CANCELLED: 'Cancelled',
    },

    PAYMENT_METHODS: ['Cash', 'Check', 'Bank Transfer', 'Credit Card'],
};
