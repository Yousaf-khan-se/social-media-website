const { HTTP_STATUS } = require('../constants/messages');

class ResponseHandler {
    // Success response
    static success(res, data, statusCode = HTTP_STATUS.OK) {
        return res.status(statusCode).json({
            success: true,
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    // Error response
    static error(res, message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
        const response = {
            success: false,
            error: message,
            timestamp: new Date().toISOString()
        };

        if (details) {
            response.details = details;
        }

        return res.status(statusCode).json(response);
    }

    // Created response
    static created(res, data) {
        return this.success(res, data, HTTP_STATUS.CREATED);
    }

    // Bad request response
    static badRequest(res, message, details = null) {
        return this.error(res, message, HTTP_STATUS.BAD_REQUEST, details);
    }

    // Unauthorized response
    static unauthorized(res, message) {
        return this.error(res, message, HTTP_STATUS.UNAUTHORIZED);
    }

    // Not found response
    static notFound(res, message) {
        return this.error(res, message, HTTP_STATUS.NOT_FOUND);
    }

    // Validation error response
    static validationError(res, errors) {
        return this.badRequest(res, 'Validation failed', { errors });
    }

    // Internal server error response
    static internalError(res, message = 'Internal server error') {
        return this.error(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
}

module.exports = ResponseHandler;
