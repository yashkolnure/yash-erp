const UserCompanyAssignment = require('../models/UserCompanyAssignment');
const RolePermission = require('../models/RolePermission');

const checkPermission = (module, feature, action) => {
    return async (req, res, next) => {
        try {
            const companyId = req.params.companyId;

            const assignment = await UserCompanyAssignment.findOne({
                user_id: req.user.userId,
                company_id: companyId,
                is_active: true,
            });

            if (!assignment) {
                return res.status(403).json({ error: 'No access to this company' });
            }

            const permission = await RolePermission.findOne({
                role_id: assignment.role_id,
                module,
                feature,
                action,
                permission_grant: 'Allow',
            });

            if (!permission) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            req.companyAssignment = assignment;
            next();
        } catch (error) {
            return res.status(500).json({ error: 'Permission check failed' });
        }
    };
};

module.exports = checkPermission;
