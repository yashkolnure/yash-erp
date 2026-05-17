const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    entity_type: String,
    entity_id: mongoose.Schema.Types.ObjectId,
    action: String,
    old_values: mongoose.Schema.Types.Mixed,
    new_values: mongoose.Schema.Types.Mixed,
    ip_address: String,
    timestamp: { type: Date, default: Date.now },
});

auditLogSchema.index({ entity_type: 1, entity_id: 1 });
auditLogSchema.index({ user_id: 1, company_id: 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
