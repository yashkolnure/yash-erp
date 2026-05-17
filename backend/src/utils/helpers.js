const generateDocumentNumber = async (Model, prefix, field, companyId) => {
    const year = new Date().getFullYear();
    const count = await Model.countDocuments({ company_id: companyId });
    return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
};

const calculateLineItems = (lineItems) => {
    let subtotal = 0;
    let tax_amount = 0;

    const calculated = lineItems.map(item => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const taxRate = parseFloat(item.tax_rate) || 0;

        const lineTotal = qty * price;
        const lineTax = lineTotal * (taxRate / 100);

        subtotal += lineTotal;
        tax_amount += lineTax;

        return { ...item, line_total: lineTotal };
    });

    return { line_items: calculated, subtotal, tax_amount };
};

const toDecimal = (value) => parseFloat(value?.toString() || '0');

module.exports = { generateDocumentNumber, calculateLineItems, toDecimal };
