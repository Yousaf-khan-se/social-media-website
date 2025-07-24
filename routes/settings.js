const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
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

// All settings routes require authentication
router.use(authenticateToken);

// Get all user settings
router.get('/', settingsController.getUserSettings);

// Get settings summary/overview
router.get('/summary', settingsController.getSettingsSummary);

// Update all settings at once
router.put('/',
    [
        body('privacy').optional().isObject().withMessage('Privacy must be an object'),
        body('notifications').optional().isObject().withMessage('Notifications must be an object'),
        body('security').optional().isObject().withMessage('Security must be an object'),
        body('chat').optional().isObject().withMessage('Chat must be an object'),
        body('content').optional().isObject().withMessage('Content must be an object'),
        body('accessibility').optional().isObject().withMessage('Accessibility must be an object'),
        body('preferences').optional().isObject().withMessage('Preferences must be an object')
    ],
    handleValidationErrors,
    settingsController.updateUserSettings
);

// Privacy settings
router.put('/privacy',
    [
        body('profileVisibility').optional().isIn(['public', 'followers', 'private']).withMessage('Invalid profile visibility'),
        body('showLastSeen').optional().isBoolean().withMessage('Show last seen must be boolean'),
        body('showOnlineStatus').optional().isBoolean().withMessage('Show online status must be boolean'),
        body('defaultPostVisibility').optional().isIn(['public', 'followers', 'private']).withMessage('Invalid post visibility'),
        body('allowPostSharing').optional().isBoolean().withMessage('Allow post sharing must be boolean'),
        body('whoCanMessageMe').optional().isIn(['everyone', 'followers', 'nobody']).withMessage('Invalid message permission'),
        body('whoCanFollowMe').optional().isIn(['everyone', 'manual_approval']).withMessage('Invalid follow permission'),
        body('whoCanSeeMyFollowers').optional().isIn(['everyone', 'followers', 'private']).withMessage('Invalid followers visibility'),
        body('whoCanSeeMyFollowing').optional().isIn(['everyone', 'followers', 'private']).withMessage('Invalid following visibility'),
        body('allowSearchByEmail').optional().isBoolean().withMessage('Allow search by email must be boolean'),
        body('allowSearchByUsername').optional().isBoolean().withMessage('Allow search by username must be boolean'),
        body('showInSuggestions').optional().isBoolean().withMessage('Show in suggestions must be boolean')
    ],
    handleValidationErrors,
    settingsController.updatePrivacySettings
);

// Notification settings
router.put('/notifications',
    [
        body('pushNotifications').optional().isBoolean().withMessage('Push notifications must be boolean'),
        body('likes').optional().isBoolean().withMessage('Likes must be boolean'),
        body('comments').optional().isBoolean().withMessage('Comments must be boolean'),
        body('shares').optional().isBoolean().withMessage('Shares must be boolean'),
        body('follows').optional().isBoolean().withMessage('Follows must be boolean'),
        body('followerRequests').optional().isBoolean().withMessage('Follower requests must be boolean'),
        body('messages').optional().isBoolean().withMessage('Messages must be boolean'),
        body('groupChats').optional().isBoolean().withMessage('Group chats must be boolean'),
        body('messagePreview').optional().isBoolean().withMessage('Message preview must be boolean'),
        body('emailNotifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
        body('weeklyDigest').optional().isBoolean().withMessage('Weekly digest must be boolean'),
        body('quietHours.enabled').optional().isBoolean().withMessage('Quiet hours enabled must be boolean'),
        body('quietHours.startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
        body('quietHours.endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format')
    ],
    handleValidationErrors,
    settingsController.updateNotificationSettings
);

// Security settings
router.put('/security',
    [
        body('twoFactorEnabled').optional().isBoolean().withMessage('Two factor enabled must be boolean'),
        body('loginAlerts').optional().isBoolean().withMessage('Login alerts must be boolean'),
        body('logoutOtherDevices').optional().isBoolean().withMessage('Logout other devices must be boolean'),
        body('securityQuestionSet').optional().isBoolean().withMessage('Security question set must be boolean')
    ],
    handleValidationErrors,
    settingsController.updateSecuritySettings
);

// Chat settings
router.put('/chat',
    [
        body('readReceipts').optional().isBoolean().withMessage('Read receipts must be boolean'),
        body('typingIndicators').optional().isBoolean().withMessage('Typing indicators must be boolean'),
        body('lastSeenInGroups').optional().isBoolean().withMessage('Last seen in groups must be boolean'),
        body('autoDownloadImages').optional().isIn(['never', 'wifi', 'always']).withMessage('Invalid auto download images setting'),
        body('autoDownloadVideos').optional().isIn(['never', 'wifi', 'always']).withMessage('Invalid auto download videos setting'),
        body('autoDownloadFiles').optional().isIn(['never', 'wifi', 'always']).withMessage('Invalid auto download files setting'),
        body('autoDeleteMessages.enabled').optional().isBoolean().withMessage('Auto delete messages enabled must be boolean'),
        body('autoDeleteMessages.duration').optional().isInt({ min: 1, max: 365 }).withMessage('Auto delete duration must be between 1 and 365 days'),
        body('backupChats').optional().isBoolean().withMessage('Backup chats must be boolean')
    ],
    handleValidationErrors,
    settingsController.updateChatSettings
);

// Content settings
router.put('/content',
    [
        body('highQualityUploads').optional().isBoolean().withMessage('High quality uploads must be boolean'),
        body('compressImages').optional().isBoolean().withMessage('Compress images must be boolean'),
        body('contentFilter').optional().isIn(['none', 'mild', 'strict']).withMessage('Invalid content filter setting'),
        body('hideOffensiveContent').optional().isBoolean().withMessage('Hide offensive content must be boolean'),
        body('language').optional().isLength({ min: 2, max: 5 }).withMessage('Invalid language code'),
        body('timezone').optional().isString().withMessage('Timezone must be a string'),
        body('dateFormat').optional().isIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).withMessage('Invalid date format')
    ],
    handleValidationErrors,
    settingsController.updateContentSettings
);

// Accessibility settings
router.put('/accessibility',
    [
        body('fontSize').optional().isIn(['small', 'medium', 'large', 'extra-large']).withMessage('Invalid font size'),
        body('highContrast').optional().isBoolean().withMessage('High contrast must be boolean'),
        body('reducedMotion').optional().isBoolean().withMessage('Reduced motion must be boolean'),
        body('screenReader').optional().isBoolean().withMessage('Screen reader must be boolean')
    ],
    handleValidationErrors,
    settingsController.updateAccessibilitySettings
);

// App preferences
router.put('/preferences',
    [
        body('theme').optional().isIn(['light', 'dark', 'auto']).withMessage('Invalid theme'),
        body('autoPlayVideos').optional().isBoolean().withMessage('Auto play videos must be boolean'),
        body('soundEnabled').optional().isBoolean().withMessage('Sound enabled must be boolean'),
        body('hapticFeedback').optional().isBoolean().withMessage('Haptic feedback must be boolean')
    ],
    handleValidationErrors,
    settingsController.updatePreferences
);

// Block/Unblock users
router.post('/block',
    [
        body('targetUserId').isMongoId().withMessage('Invalid target user ID'),
        body('reason').optional().isString().isLength({ max: 200 }).withMessage('Reason must be a string with max 200 characters')
    ],
    handleValidationErrors,
    settingsController.blockUser
);

router.post('/unblock',
    [
        body('targetUserId').isMongoId().withMessage('Invalid target user ID')
    ],
    handleValidationErrors,
    settingsController.unblockUser
);

// Get blocked users
router.get('/blocked-users',
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    handleValidationErrors,
    settingsController.getBlockedUsers
);

// Block/Unblock keywords
router.post('/block-keyword',
    [
        body('keyword').isString().isLength({ min: 1, max: 100 }).withMessage('Keyword must be between 1 and 100 characters')
    ],
    handleValidationErrors,
    settingsController.addBlockedKeyword
);

router.post('/unblock-keyword',
    [
        body('keyword').isString().isLength({ min: 1, max: 100 }).withMessage('Keyword must be between 1 and 100 characters')
    ],
    handleValidationErrors,
    settingsController.removeBlockedKeyword
);

// Get blocked keywords
router.get('/blocked-keywords',
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    handleValidationErrors,
    settingsController.getBlockedKeywords
);

// Reset settings
router.post('/reset',
    [
        body('section').optional().isIn(['privacy', 'notifications', 'security', 'chat', 'content', 'accessibility', 'preferences']).withMessage('Invalid section')
    ],
    handleValidationErrors,
    settingsController.resetSettings
);

// Export/Import settings
router.get('/export', settingsController.exportSettings);

router.post('/import',
    [
        body().isObject().withMessage('Settings data must be an object')
    ],
    handleValidationErrors,
    settingsController.importSettings
);

module.exports = router;
