const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    role_name: { type: String, required: true },
    description: String,
    is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

roleSchema.index({ company_id: 1, role_name: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
