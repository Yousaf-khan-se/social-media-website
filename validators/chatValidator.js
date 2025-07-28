const { body, param, query } = require('express-validator');
const { VALIDATION_MESSAGES } = require('../constants/messages');

// Validation for creating a chat
const validateCreateChat = [
    body('participants')
        .isArray({ min: 1 })
        .withMessage(VALIDATION_MESSAGES.PARTICIPANTS_REQUIRED)
        .custom((participants) => {
            if (!participants.every(p => typeof p === 'string' && p.length === 24)) {
                throw new Error(VALIDATION_MESSAGES.INVALID_PARTICIPANTS);
            }
            return true;
        }),
    body('isGroup')
        .optional()
        .isBoolean()
        .withMessage('isGroup must be a boolean'),
    body('name')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Group name must be between 1 and 50 characters'),
    body('message')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Message cannot exceed 500 characters')
];

// Validation for chat room ID parameter
const validateChatId = [
    param('roomId')
        .isMongoId()
        .withMessage(VALIDATION_MESSAGES.INVALID_CHAT_ID)
];

// Validation for message ID parameter
const validateMessageId = [
    param('messageId')
        .isMongoId()
        .withMessage(VALIDATION_MESSAGES.INVALID_MESSAGE_ID)
];

// Validation for pagination query parameters
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
];

// Validation for sending a message
const validateSendMessage = [
    body('content')
        .notEmpty()
        .withMessage(VALIDATION_MESSAGES.MESSAGE_CONTENT_REQUIRED)
        .isLength({ max: 1000 })
        .withMessage(VALIDATION_MESSAGES.MESSAGE_CONTENT_TOO_LONG),
    body('messageType')
        .optional()
        .isIn(['text', 'image', 'video', 'file'])
        .withMessage(VALIDATION_MESSAGES.INVALID_MESSAGE_TYPE),
    body('caption')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Caption cannot exceed 200 characters')
];

// Validation for responding to chat permission request
const validateChatPermissionResponse = [
    param('requestId')
        .isMongoId()
        .withMessage('Invalid request ID provided'),
    body('response')
        .isIn(['approved', 'denied'])
        .withMessage('Response must be either "approved" or "denied"')
];

module.exports = {
    validateCreateChat,
    validateChatId,
    validateMessageId,
    validatePagination,
    validateSendMessage,
    validateChatPermissionResponse
};
