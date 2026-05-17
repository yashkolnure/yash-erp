const mongoose = require('mongoose');
const componentSchema = new mongoose.Schema({
    name: { type: String, required: true },        // e.g. "Basic Pay", "HRA", "PF"
    type: { type: String, enum: ['Earning', 'Deduction'], required: true },
    calc_type: { type: String, enum: ['Fixed', 'Percentage of Basic', 'Percentage of Gross'], default: 'Fixed' },
    value: { type: mongoose.Schema.Types.Decimal128, default: 0 }, // amount or percentage
    is_taxable: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
});
const schema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    description: { type: String },
    components: [componentSchema],
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.index({ company_id: 1 });
module.exports = mongoose.model('SalaryStructure', schema);
