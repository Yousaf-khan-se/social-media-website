const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

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

// All notification routes require authentication
router.use(authenticateToken);

// Get user notifications with pagination and filters
router.get('/',
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('type').optional().isIn(['like', 'comment', 'share', 'follow', 'message', 'chat_created', 'group_created', 'group_added']).withMessage('Invalid notification type'),
        query('unreadOnly').optional().isBoolean().withMessage('unreadOnly must be a boolean')
    ],
    handleValidationErrors,
    notificationController.getUserNotifications
);

// Get notification statistics
router.get('/stats', notificationController.getNotificationStats);

// Mark specific notification as read
router.put('/:notificationId/read',
    [
        param('notificationId').isMongoId().withMessage('Invalid notification ID')
    ],
    handleValidationErrors,
    notificationController.markAsRead
);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// Add FCM token for push notifications
router.post('/fcm-token',
    [
        body('token').notEmpty().withMessage('FCM token is required'),
        body('device').optional().isIn(['web', 'android', 'ios']).withMessage('Invalid device type')
    ],
    handleValidationErrors,
    notificationController.addFCMToken
);

// Remove FCM token
router.delete('/fcm-token',
    [
        body('token').notEmpty().withMessage('FCM token is required')
    ],
    handleValidationErrors,
    notificationController.removeFCMToken
);

// Delete specific notification
router.delete('/:notificationId',
    [
        param('notificationId').isMongoId().withMessage('Invalid notification ID')
    ],
    handleValidationErrors,
    notificationController.deleteNotification
);

// Clear all notifications
router.delete('/', notificationController.clearAllNotifications);


module.exports = router;
