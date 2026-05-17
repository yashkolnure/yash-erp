let transporter;
try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || process.env.POSTFIX_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || process.env.POSTFIX_PORT || '25'),
        secure: false,
        ignoreTLS: true,
    });
} catch {
    transporter = null;
}

const sendMail = async (to, subject, html, attachments = []) => {
    if (!transporter) {
        console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
        return;
    }
    await transporter.sendMail({
        from: process.env.SMTP_USER || process.env.POSTFIX_FROM_EMAIL || 'erp@yourdomain.com',
        to,
        subject,
        html,
        attachments,
    });
};

exports.sendInvoiceEmail = async (invoice, pdfBuffer) => {
    const customerName = invoice.customer_id?.customer_name || 'Customer';
    const email = invoice.customer_id?.email;

    if (!email) throw new Error('Customer email not found');

    await sendMail(
        email,
        `Invoice ${invoice.invoice_number}`,
        `
        <h2>Invoice ${invoice.invoice_number}</h2>
        <p>Dear ${customerName},</p>
        <p>Please find your invoice attached. Total amount due: <strong>${invoice.currency} ${parseFloat(invoice.amount_due?.toString() || 0).toFixed(2)}</strong></p>
        <p>Due date: ${new Date(invoice.due_date).toLocaleDateString()}</p>
        <p>Thank you for your business!</p>
        `,
        [{ filename: `Invoice_${invoice.invoice_number}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
    );
};

exports.sendPaymentReminder = async ({ to, customerName, invoiceNumber, amountDue, dueDate, currency = 'USD' }) => {
    const subject = `Payment Reminder: Invoice ${invoiceNumber}`;
    const html = `
        <h2>Payment Reminder</h2>
        <p>Dear ${customerName},</p>
        <p>This is a reminder that invoice <strong>${invoiceNumber}</strong> for <strong>${currency} ${parseFloat(amountDue).toFixed(2)}</strong> was due on <strong>${new Date(dueDate).toLocaleDateString()}</strong>.</p>
        <p>Please arrange payment at your earliest convenience.</p>
        <p>If you have already paid, please disregard this reminder.</p>
        <br/><p>Thank you.</p>
    `;
    if (transporter && (process.env.SMTP_USER || process.env.POSTFIX_FROM_EMAIL)) {
        await transporter.sendMail({ from: process.env.SMTP_USER || process.env.POSTFIX_FROM_EMAIL, to, subject, html });
        return { sent: true, method: 'email' };
    } else {
        console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
        return { sent: true, method: 'stub', note: 'SMTP not configured — email logged to console' };
    }
};

exports.sendPayslipEmail = async (employee, pdfBuffer, period) => {
    if (!employee.email) throw new Error('Employee email not found');

    await sendMail(
        employee.email,
        `Payslip for ${period}`,
        `<p>Dear ${employee.first_name},</p><p>Please find your payslip for ${period} attached.</p>`,
        [{ filename: `Payslip_${period}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
    );
};
