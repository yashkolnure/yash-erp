const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    let status = err.status || 500;
    let message = err.message || 'Internal server error';

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        status = 400;
        message = Object.values(err.errors).map(e => e.message).join(', ');
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        status = 409;
        const field = Object.keys(err.keyValue)[0];
        message = `Duplicate value for field: ${field}`;
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        status = 400;
        message = `Invalid value for field: ${err.path}`;
    }

    res.status(status).json({ error: message });
};

module.exports = errorHandler;
