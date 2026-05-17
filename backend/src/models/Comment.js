const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const commentSchema = new Schema({
    company_id: { type: Types.ObjectId, ref: 'Company', required: true },
    entity_type: { type: String, required: true }, // 'Invoice' | 'SalesOrder' | 'PurchaseOrder' | 'Payment'
    entity_id: { type: Types.ObjectId, required: true },
    user_id: { type: Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, maxlength: 4000 },
    is_internal: { type: Boolean, default: false }, // internal note vs visible to customer
    mentions: [{ type: Types.ObjectId, ref: 'User' }],
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

commentSchema.index({ entity_type: 1, entity_id: 1 });
commentSchema.index({ company_id: 1 });

module.exports = mongoose.model('Comment', commentSchema);
