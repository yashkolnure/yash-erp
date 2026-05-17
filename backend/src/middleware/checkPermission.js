const UserCompanyAssignment = require('../models/UserCompanyAssignment');
const RolePermission = require('../models/RolePermission');

// Simple in-memory permission cache: key = userId:companyId, value = { perms, expiresAt }
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getPermissions = async (userId, companyId) => {
    const key = `${userId}:${companyId}`;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.perms;

    const assignment = await UserCompanyAssignment.findOne({ user_id: userId, company_id: companyId, is_active: true }).populate('role_id', 'role_name');
    if (!assignment) return null;

    const perms = await RolePermission.find({ role_id: assignment.role_id._id, permission_grant: 'Allow' });
    const permSet = new Set(perms.map(p => `${p.module}:${p.action}`));

    cache.set(key, { perms: { role: assignment.role_id.role_name, set: permSet }, expiresAt: Date.now() + CACHE_TTL_MS });
    return cache.get(key).perms;
};

// Clear cache for a user (call after role change)
const clearUserCache = (userId, companyId) => cache.delete(`${userId}:${companyId}`);

// Middleware factory: checkPermission('Sales', 'create')
const checkPermission = (module, action) => async (req, res, next) => {
    try {
        const { companyId } = req.params;
        if (!companyId) return next(); // no company context, skip

        const perms = await getPermissions(req.user.userId, companyId);
        if (!perms) return res.status(403).json({ error: 'No access to this company' });

        // Super admin role bypasses all checks
        if (perms.role === 'Super Admin' || perms.role === 'Admin') return next();

        if (!perms.set.has(`${module}:${action}`)) {
            return res.status(403).json({ error: `Permission denied: ${module}:${action}` });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Endpoint helper: GET /:companyId/admin/my-permissions
const getMyPermissions = async (req, res) => {
    try {
        const { companyId } = req.params;
        const assignment = await UserCompanyAssignment.findOne({
            user_id: req.user.userId, company_id: companyId, is_active: true,
        }).populate('role_id');

        if (!assignment) return res.status(403).json({ error: 'No access' });

        const perms = await RolePermission.find({ role_id: assignment.role_id._id, permission_grant: 'Allow' });
        res.json({
            success: true,
            data: {
                role: assignment.role_id.role_name,
                is_admin: ['Super Admin', 'Admin'].includes(assignment.role_id.role_name),
                permissions: perms.map(p => ({ module: p.module, action: p.action })),
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { checkPermission, getMyPermissions, clearUserCache };
