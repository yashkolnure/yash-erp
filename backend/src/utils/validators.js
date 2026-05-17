const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidDate = (date) => !isNaN(new Date(date).getTime());

const isPositiveNumber = (value) => typeof value === 'number' && value > 0;

const isNonNegativeNumber = (value) => typeof value === 'number' && value >= 0;

const validateLineItems = (lineItems) => {
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
        return 'At least one line item is required';
    }

    for (const item of lineItems) {
        if (!item.quantity || item.quantity <= 0) {
            return 'Each line item must have a positive quantity';
        }
        if (item.unit_price === undefined || item.unit_price < 0) {
            return 'Each line item must have a valid unit price';
        }
    }

    return null;
};

module.exports = { isValidEmail, isValidDate, isPositiveNumber, isNonNegativeNumber, validateLineItems };
