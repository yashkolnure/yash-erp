const SalaryStructure = require('../models/SalaryStructure');

exports.listStructures = async (req, res) => {
    try {
        const structures = await SalaryStructure.find({ company_id: req.params.companyId, is_active: true });
        res.json({ success: true, data: structures });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createStructure = async (req, res) => {
    try {
        const s = await SalaryStructure.create({ ...req.body, company_id: req.params.companyId, created_by: req.user.userId });
        res.status(201).json({ success: true, data: s });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getStructure = async (req, res) => {
    try {
        const s = await SalaryStructure.findById(req.params.id);
        if (!s) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, data: s });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateStructure = async (req, res) => {
    try {
        const s = await SalaryStructure.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: s });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.computePayslip = async (req, res) => {
    // Given employee_id, compute earnings and deductions based on their salary structure
    try {
        const Employee = require('../models/Employee');
        const emp = await Employee.findById(req.params.employeeId).populate('salary_structure_id');
        if (!emp) return res.status(404).json({ error: 'Employee not found' });
        if (!emp.salary_structure_id) return res.status(400).json({ error: 'Employee has no salary structure assigned' });

        const basic = parseFloat(emp.basic_salary?.toString() || 0);
        const components = emp.salary_structure_id.components || [];

        let grossEarnings = basic;
        const lines = [{ name: 'Basic Salary', type: 'Earning', amount: basic }];

        // Earnings first
        components.filter(c => c.type === 'Earning').sort((a, b) => a.order - b.order).forEach(c => {
            let amount = 0;
            const val = parseFloat(c.value?.toString() || 0);
            if (c.calc_type === 'Fixed') amount = val;
            else if (c.calc_type === 'Percentage of Basic') amount = basic * val / 100;
            else if (c.calc_type === 'Percentage of Gross') amount = grossEarnings * val / 100;
            grossEarnings += amount;
            lines.push({ name: c.name, type: 'Earning', amount });
        });

        // Deductions
        let totalDeductions = 0;
        components.filter(c => c.type === 'Deduction').sort((a, b) => a.order - b.order).forEach(c => {
            let amount = 0;
            const val = parseFloat(c.value?.toString() || 0);
            if (c.calc_type === 'Fixed') amount = val;
            else if (c.calc_type === 'Percentage of Basic') amount = basic * val / 100;
            else if (c.calc_type === 'Percentage of Gross') amount = grossEarnings * val / 100;
            totalDeductions += amount;
            lines.push({ name: c.name, type: 'Deduction', amount });
        });

        res.json({ success: true, data: { employee: emp, lines, gross_earnings: grossEarnings, total_deductions: totalDeductions, net_pay: grossEarnings - totalDeductions } });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
