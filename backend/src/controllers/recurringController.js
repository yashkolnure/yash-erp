const RecurringTemplate = require('../models/RecurringTemplate');

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const nextDate = (current, frequency) => {
    const d = new Date(current);
    switch (frequency) {
        case 'Daily': d.setDate(d.getDate() + 1); break;
        case 'Weekly': d.setDate(d.getDate() + 7); break;
        case 'Monthly': d.setMonth(d.getMonth() + 1); break;
        case 'Quarterly': d.setMonth(d.getMonth() + 3); break;
        case 'Yearly': d.setFullYear(d.getFullYear() + 1); break;
    }
    return d;
};

exports.listTemplates = async (req, res) => {
    try {
        const { companyId } = req.params;
        const { type } = req.query;
        const filter = { company_id: companyId };
        if (type) filter.type = type;
        const data = await RecurringTemplate.find(filter)
            .populate('customer_id', 'customer_name')
            .populate('vendor_id', 'vendor_name')
            .sort({ next_run_date: 1 });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const { companyId } = req.params;
        const template = await RecurringTemplate.create({ ...req.body, company_id: companyId });
        res.status(201).json({ success: true, data: template });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTemplate = async (req, res) => {
    try {
        const template = await RecurringTemplate.findById(req.params.id)
            .populate('customer_id', 'customer_name')
            .populate('vendor_id', 'vendor_name');
        if (!template) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, data: template });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const template = await RecurringTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: template });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.toggleActive = async (req, res) => {
    try {
        const template = await RecurringTemplate.findById(req.params.id);
        if (!template) return res.status(404).json({ error: 'Not found' });
        template.is_active = !template.is_active;
        await template.save();
        res.json({ success: true, data: template });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        await RecurringTemplate.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Called by scheduler or manually — generates the document for a template
exports.runTemplate = async (req, res) => {
    try {
        const template = await RecurringTemplate.findById(req.params.id);
        if (!template || !template.is_active) return res.status(400).json({ error: 'Template not active' });

        template.last_run_date = new Date();
        template.run_count += 1;
        template.next_run_date = nextDate(template.next_run_date, template.frequency);
        if (template.end_date && template.next_run_date > template.end_date) {
            template.is_active = false;
        }
        await template.save();

        res.json({ success: true, message: 'Template run recorded. Document generation requires integration with invoice/bill controllers.', data: template });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
