const PDFDocument = require('pdfkit');

const generatePDF = (buildFn) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        buildFn(doc);
        doc.end();
    });
};

exports.generateInvoicePDF = async (invoice) => {
    const customerName = invoice.customer_id?.customer_name || 'N/A';
    const currency = invoice.currency || 'USD';

    return generatePDF((doc) => {
        doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica').text(`Invoice #: ${invoice.invoice_number}`);
        doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`);
        doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`);
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Bill To:');
        doc.font('Helvetica').text(customerName);
        doc.moveDown();

        // Line items header
        doc.font('Helvetica-Bold');
        doc.text('Description', 50, doc.y, { width: 220, continued: true });
        doc.text('Qty', 270, doc.y, { width: 60, continued: true });
        doc.text('Unit Price', 330, doc.y, { width: 100, continued: true });
        doc.text('Total', 430, doc.y, { width: 100 });
        doc.font('Helvetica');

        for (const item of invoice.line_items || []) {
            const lineTotal = parseFloat(item.line_total?.toString() || 0);
            doc.text(item.description || 'Item', 50, doc.y, { width: 220, continued: true });
            doc.text(String(item.quantity), 270, doc.y, { width: 60, continued: true });
            doc.text(`${currency} ${parseFloat(item.unit_price?.toString() || 0).toFixed(2)}`, 330, doc.y, { width: 100, continued: true });
            doc.text(`${currency} ${lineTotal.toFixed(2)}`, 430, doc.y, { width: 100 });
        }

        doc.moveDown();
        doc.font('Helvetica-Bold').text(`Subtotal: ${currency} ${parseFloat(invoice.subtotal?.toString() || 0).toFixed(2)}`, { align: 'right' });
        doc.text(`Tax: ${currency} ${parseFloat(invoice.tax_amount?.toString() || 0).toFixed(2)}`, { align: 'right' });
        doc.fontSize(14).text(`Total: ${currency} ${parseFloat(invoice.total_amount?.toString() || 0).toFixed(2)}`, { align: 'right' });

        if (invoice.notes) {
            doc.moveDown().fontSize(10).font('Helvetica').text(`Notes: ${invoice.notes}`);
        }
    });
};

exports.generatePayslipPDF = async (employee, payroll) => {
    return generatePDF((doc) => {
        doc.fontSize(18).font('Helvetica-Bold').text('PAYSLIP', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica').text(`Employee: ${employee.first_name} ${employee.last_name || ''}`);
        doc.text(`Employee Code: ${employee.employee_code}`);
        doc.text(`Department: ${employee.department || 'N/A'}`);
        doc.text(`Period: ${payroll.pay_period}`);
        doc.moveDown();

        doc.font('Helvetica-Bold').text('Earnings');
        doc.font('Helvetica').text(`Basic Salary: ${employee.currency || 'USD'} ${parseFloat(employee.salary?.toString() || 0).toFixed(2)}`);

        if (payroll.deductions) {
            doc.moveDown().font('Helvetica-Bold').text('Deductions');
            for (const [key, value] of Object.entries(payroll.deductions)) {
                doc.font('Helvetica').text(`${key}: ${parseFloat(value).toFixed(2)}`);
            }
        }

        doc.moveDown();
        doc.fontSize(14).font('Helvetica-Bold').text(`Net Pay: ${employee.currency || 'USD'} ${parseFloat(payroll.net_pay || 0).toFixed(2)}`, { align: 'right' });
    });
};
