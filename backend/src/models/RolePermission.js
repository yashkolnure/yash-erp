const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    module: { type: String, required: true },
    feature: { type: String, required: true },
    action: { type: String, required: true },
    permission_grant: { type: String, enum: ['Allow', 'Deny'], default: 'Allow' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

rolePermissionSchema.index({ role_id: 1, module: 1, feature: 1, action: 1 }, { unique: true });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
