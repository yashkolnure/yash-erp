const mongoose = require('mongoose');

const userCompanyAssignmentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

userCompanyAssignmentSchema.index({ user_id: 1, company_id: 1 }, { unique: true });

module.exports = mongoose.model('UserCompanyAssignment', userCompanyAssignmentSchema);
