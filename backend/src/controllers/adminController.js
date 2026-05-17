const Company = require('../models/Company');
const BankAccount = require('../models/BankAccount');
const User = require('../models/User');
const Role = require('../models/Role');
const RolePermission = require('../models/RolePermission');
const UserCompanyAssignment = require('../models/UserCompanyAssignment');
const bcrypt = require('bcryptjs');

// ── Company Profile ─────────────────────────────────────────────────────

exports.getCompanyProfile = async (req, res) => {
    try {
        const company = await Company.findById(req.params.companyId);
        if (!company) return res.status(404).json({ error: 'Company not found' });
        res.json({ success: true, data: company });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateCompanyProfile = async (req, res) => {
    try {
        const allowed = [
            'company_name', 'tax_id', 'gst_number', 'pan_number', 'country', 'state',
            'city', 'postal_code', 'address', 'email', 'phone', 'website',
            'primary_currency', 'supported_currencies', 'fiscal_year_start', 'fiscal_year_end',
        ];
        const update = {};
        allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
        update.updated_by = req.user.userId;

        const company = await Company.findByIdAndUpdate(req.params.companyId, { $set: update }, { new: true, runValidators: true });
        if (!company) return res.status(404).json({ error: 'Company not found' });
        res.json({ success: true, data: company, message: 'Company profile updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Bank Accounts ───────────────────────────────────────────────────────

exports.listBankAccounts = async (req, res) => {
    try {
        const accounts = await BankAccount.find({ company_id: req.params.companyId, is_active: true }).sort({ is_default: -1, created_at: 1 });
        res.json({ success: true, data: accounts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createBankAccount = async (req, res) => {
    try {
        const { companyId } = req.params;
        const data = { ...req.body, company_id: companyId };

        // If marked default, unset others
        if (data.is_default) {
            await BankAccount.updateMany({ company_id: companyId }, { $set: { is_default: false } });
        }

        const account = await BankAccount.create(data);
        res.status(201).json({ success: true, data: account, message: 'Bank account added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateBankAccount = async (req, res) => {
    try {
        const { companyId, id } = req.params;
        if (req.body.is_default) {
            await BankAccount.updateMany({ company_id: companyId }, { $set: { is_default: false } });
        }
        const account = await BankAccount.findOneAndUpdate(
            { _id: id, company_id: companyId },
            { $set: req.body },
            { new: true }
        );
        if (!account) return res.status(404).json({ error: 'Bank account not found' });
        res.json({ success: true, data: account, message: 'Bank account updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteBankAccount = async (req, res) => {
    try {
        await BankAccount.findOneAndUpdate(
            { _id: req.params.id, company_id: req.params.companyId },
            { $set: { is_active: false } }
        );
        res.json({ success: true, message: 'Bank account removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Users ───────────────────────────────────────────────────────────────

exports.listUsers = async (req, res) => {
    try {
        const assignments = await UserCompanyAssignment.find({
            company_id: req.params.companyId,
            is_active: true,
        }).populate('user_id', 'first_name last_name email phone user_status created_at')
          .populate('role_id', 'role_name');

        const users = assignments.map(a => ({
            assignment_id: a._id,
            ...a.user_id?.toObject(),
            role: a.role_id?.role_name,
            role_id: a.role_id?._id,
        }));

        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.inviteUser = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { email, first_name, last_name, role_id, password } = req.body;

        let user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            user = await User.create({
                email: email.toLowerCase(),
                first_name,
                last_name,
                password_hash: password || 'TempPass@123',
                user_status: 'Active',
            });
        }

        const existing = await UserCompanyAssignment.findOne({ user_id: user._id, company_id: companyId });
        if (existing) return res.status(400).json({ error: 'User already has access to this company' });

        await UserCompanyAssignment.create({ user_id: user._id, company_id: companyId, role_id });

        res.status(201).json({ success: true, message: 'User invited successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { companyId, assignmentId } = req.params;
        const assignment = await UserCompanyAssignment.findOneAndUpdate(
            { _id: assignmentId, company_id: companyId },
            { $set: { role_id: req.body.role_id } },
            { new: true }
        );
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        res.json({ success: true, message: 'User role updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.removeUser = async (req, res) => {
    try {
        const { companyId, assignmentId } = req.params;
        await UserCompanyAssignment.findOneAndUpdate(
            { _id: assignmentId, company_id: companyId },
            { $set: { is_active: false } }
        );
        res.json({ success: true, message: 'User access revoked' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ── Roles ───────────────────────────────────────────────────────────────

exports.listRoles = async (req, res) => {
    try {
        const roles = await Role.find({ company_id: req.params.companyId, is_active: true });
        res.json({ success: true, data: roles });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createRole = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { role_name, description, permissions } = req.body;

        const role = await Role.create({ company_id: companyId, role_name, description });

        if (permissions && permissions.length) {
            const perms = permissions.map(p => ({ role_id: role._id, ...p }));
            await RolePermission.insertMany(perms, { ordered: false }).catch(() => {});
        }

        res.status(201).json({ success: true, data: role, message: 'Role created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        const role = await Role.findOneAndUpdate(
            { _id: req.params.roleId, company_id: req.params.companyId },
            { $set: { role_name: req.body.role_name, description: req.body.description } },
            { new: true }
        );
        if (!role) return res.status(404).json({ error: 'Role not found' });
        res.json({ success: true, data: role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getRolePermissions = async (req, res) => {
    try {
        const perms = await RolePermission.find({ role_id: req.params.roleId });
        res.json({ success: true, data: perms });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.setRolePermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissions } = req.body;

        await RolePermission.deleteMany({ role_id: roleId });

        if (permissions && permissions.length) {
            const perms = permissions.map(p => ({ role_id: roleId, ...p }));
            await RolePermission.insertMany(perms, { ordered: false }).catch(() => {});
        }

        res.json({ success: true, message: 'Permissions updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
