const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Quotation = require('../models/Quotation');
const AuditLog = require('../models/AuditLog');

const generateLeadNumber = async (companyId) => {
    const count = await Lead.countDocuments({ company_id: companyId });
    return `LEAD-${String(count + 1).padStart(5, '0')}`;
};

exports.createLead = async (req, res) => {
    try {
        const { companyId } = req.params;
        const lead_number = await generateLeadNumber(companyId);
        const lead = await Lead.create({ ...req.body, company_id: companyId, lead_number, created_by: req.user.userId });
        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'Lead', entity_id: lead._id, action: 'Create', new_values: lead.toObject(), ip_address: req.ip, timestamp: new Date() });
        res.status(201).json({ success: true, data: lead });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listLeads = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { stage, type, assigned_to, skip = 0, limit = 50 } = req.query;
        const filter = { company_id: companyId };
        if (stage) filter.stage = stage;
        if (type) filter.type = type;
        if (assigned_to) filter.assigned_to = assigned_to;
        const [leads, total] = await Promise.all([
            Lead.find(filter).populate('assigned_to', 'first_name last_name email').sort({ updated_at: -1 }).skip(+skip).limit(+limit),
            Lead.countDocuments(filter),
        ]);
        res.json({ success: true, data: leads, pagination: { total, skip: +skip, limit: +limit } });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id).populate('assigned_to', 'first_name last_name email').populate('converted_customer_id', 'customer_name');
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        res.json({ success: true, data: lead });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.updateLead = async (req, res) => {
    try {
        const oldLead = await Lead.findById(req.params.id);
        if (!oldLead) return res.status(404).json({ error: 'Lead not found' });
        const oldStage = oldLead.stage;
        Object.assign(oldLead, req.body);
        await oldLead.save();
        if (req.body.stage && req.body.stage !== oldStage) {
            await AuditLog.create({ user_id: req.user.userId, company_id: req.params.companyId, entity_type: 'Lead', entity_id: oldLead._id, action: 'StageChange', old_values: { stage: oldStage }, new_values: { stage: req.body.stage }, ip_address: req.ip, timestamp: new Date() });
        }
        res.json({ success: true, data: oldLead });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.addActivity = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        lead.activities.push({ ...req.body, user_id: req.user.userId, date: req.body.date || new Date() });
        await lead.save();
        res.json({ success: true, data: lead });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.convertLead = async (req, res) => {
    try {
        const { id, companyId } = req.params;
        const lead = await Lead.findById(id);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        if (lead.converted) return res.status(400).json({ error: 'Lead already converted' });

        // Create customer from lead
        const count = await Customer.countDocuments({ company_id: companyId });
        const customer_code = `CUST-${String(count + 1).padStart(5, '0')}`;
        const customer = await Customer.create({
            company_id: companyId, customer_code,
            customer_name: req.body.customer_name || lead.company_name || lead.contact_name,
            email: lead.email, phone: lead.phone, website: lead.website,
            contact_person: lead.contact_name, created_by: req.user.userId,
        });

        lead.converted = true;
        lead.stage = 'Won';
        lead.converted_customer_id = customer._id;
        lead.converted_at = new Date();
        await lead.save();

        await AuditLog.create({ user_id: req.user.userId, company_id: companyId, entity_type: 'Lead', entity_id: lead._id, action: 'Convert', new_values: { customer_id: customer._id }, ip_address: req.ip, timestamp: new Date() });

        res.json({ success: true, data: { lead, customer }, message: 'Lead converted to customer' });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getPipelineStats = async (req, res) => {
    try {
        const { companyId } = req.params;
        const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
        const results = await Promise.all(stages.map(async stage => {
            const leads = await Lead.find({ company_id: companyId, stage });
            const value = leads.reduce((s, l) => s + parseFloat(l.estimated_value?.toString() || 0), 0);
            return { stage, count: leads.length, value };
        }));
        res.json({ success: true, data: results });
    } catch (error) { res.status(500).json({ error: error.message }); }
};
