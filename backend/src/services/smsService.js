const AWS = require('aws-sdk');

const sns = new AWS.SNS({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

exports.sendSMS = async (phoneNumber, message) => {
    if (!process.env.AWS_ACCESS_KEY_ID) {
        console.warn('AWS SNS not configured, skipping SMS');
        return null;
    }

    const result = await sns.publish({
        Message: message,
        PhoneNumber: phoneNumber,
    }).promise();

    return result;
};

exports.sendPaymentDueAlert = async (phoneNumber, invoiceNumber, amount, currency = 'USD') => {
    const message = `ERP Alert: Invoice ${invoiceNumber} for ${currency} ${amount} is due. Please arrange payment.`;
    return exports.sendSMS(phoneNumber, message);
};
