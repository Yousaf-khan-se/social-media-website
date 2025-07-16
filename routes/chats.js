const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');
const {
    validateCreateChat,
    validateChatId,
    validateMessageId,
    validatePagination
} = require('../validators/chatValidator');
const { validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

// All chat routes require authentication
router.use(authenticateToken);

// Chat routes
router.post('/create', validateCreateChat, handleValidationErrors, chatController.createChat);
router.get('/', chatController.getAllUserChats);
router.delete('/:roomId', validateChatId, handleValidationErrors, chatController.deleteChat);
router.get('/:roomId/messages', validateChatId, validatePagination, handleValidationErrors, chatController.getChatById);
router.delete('/message/:messageId', validateMessageId, handleValidationErrors, chatController.deleteMessage);
router.put('/media/:roomId', validateChatId, handleValidationErrors, chatController.addMediaToChat);

module.exports = router;