const mongoose = require('mongoose');

const journalLineSchema = new mongoose.Schema({
    account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChartOfAccounts', required: true },
    debit_amount: { type: mongoose.Decimal128, default: 0 },
    credit_amount: { type: mongoose.Decimal128, default: 0 },
    description: String,
}, { _id: false });

const journalEntrySchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    journal_date: { type: Date, required: true },
    reference_number: String,
    description: String,
    status: {
        type: String,
        enum: ['Draft', 'Posted'],
        default: 'Draft',
    },
    source_type: String,
    source_id: mongoose.Schema.Types.ObjectId,
    lines: [journalLineSchema],
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    posted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    posted_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

journalEntrySchema.index({ company_id: 1, journal_date: -1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
