const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserCompanyAssignment = require('../models/UserCompanyAssignment');
const AuditLog = require('../models/AuditLog');

const signToken = (userId, email) =>
    jwt.sign({ userId, email }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '8h',
    });

exports.register = async (req, res) => {
    try {
        const { email, password, first_name, last_name, phone } = req.body;

        if (!email || !password || !first_name) {
            return res.status(400).json({ error: 'email, password, and first_name are required' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const user = await User.create({
            email,
            password_hash: password,
            first_name,
            last_name,
            phone,
        });

        const token = signToken(user._id, user.email);

        res.status(201).json({
            success: true,
            token,
            user: { _id: user._id, email: user.email, first_name: user.first_name, last_name: user.last_name },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.user_status !== 'Active') {
            return res.status(401).json({ error: `Account is ${user.user_status}` });
        }

        user.last_login = new Date();
        await user.save();

        // Get user's company assignments
        const assignments = await UserCompanyAssignment.find({
            user_id: user._id,
            is_active: true,
        }).populate('company_id role_id');

        const token = signToken(user._id, user.email);

        await AuditLog.create({
            user_id: user._id,
            action: 'Login',
            ip_address: req.ip,
            timestamp: new Date(),
        });

        res.json({
            success: true,
            token,
            user: {
                _id: user._id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                companies: assignments.map(a => ({
                    company_id: a.company_id?._id,
                    company_name: a.company_id?.company_name,
                    role: a.role_id?.role_name,
                })),
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password_hash');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const user = await User.findById(req.user.userId);

        if (!(await user.matchPassword(current_password))) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        user.password_hash = new_password;
        user.password_changed_at = new Date();
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
