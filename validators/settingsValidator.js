const { body, validationResult } = require('express-validator');

// Privacy settings validation rules
const privacyValidationRules = [
    body('profileVisibility')
        .optional()
        .isIn(['public', 'followers', 'private'])
        .withMessage('Profile visibility must be public, followers, or private'),

    body('showLastSeen')
        .optional()
        .isBoolean()
        .withMessage('Show last seen must be a boolean'),

    body('showOnlineStatus')
        .optional()
        .isBoolean()
        .withMessage('Show online status must be a boolean'),

    body('defaultPostVisibility')
        .optional()
        .isIn(['public', 'followers', 'private'])
        .withMessage('Default post visibility must be public, followers, or private'),

    body('allowPostSharing')
        .optional()
        .isBoolean()
        .withMessage('Allow post sharing must be a boolean'),

    body('whoCanMessageMe')
        .optional()
        .isIn(['everyone', 'followers', 'nobody'])
        .withMessage('Who can message me must be everyone, followers, or nobody'),

    body('whoCanFollowMe')
        .optional()
        .isIn(['everyone', 'manual_approval'])
        .withMessage('Who can follow me must be everyone or manual_approval'),

    body('whoCanSeeMyFollowers')
        .optional()
        .isIn(['everyone', 'followers', 'private'])
        .withMessage('Who can see my followers must be everyone, followers, or private'),

    body('whoCanSeeMyFollowing')
        .optional()
        .isIn(['everyone', 'followers', 'private'])
        .withMessage('Who can see my following must be everyone, followers, or private'),

    body('allowSearchByEmail')
        .optional()
        .isBoolean()
        .withMessage('Allow search by email must be a boolean'),

    body('allowSearchByUsername')
        .optional()
        .isBoolean()
        .withMessage('Allow search by username must be a boolean'),

    body('showInSuggestions')
        .optional()
        .isBoolean()
        .withMessage('Show in suggestions must be a boolean')
];

// Notification settings validation rules
const notificationValidationRules = [
    body('pushNotifications')
        .optional()
        .isBoolean()
        .withMessage('Push notifications must be a boolean'),

    body('likes')
        .optional()
        .isBoolean()
        .withMessage('Likes notifications must be a boolean'),

    body('comments')
        .optional()
        .isBoolean()
        .withMessage('Comments notifications must be a boolean'),

    body('shares')
        .optional()
        .isBoolean()
        .withMessage('Shares notifications must be a boolean'),

    body('follows')
        .optional()
        .isBoolean()
        .withMessage('Follows notifications must be a boolean'),

    body('followerRequests')
        .optional()
        .isBoolean()
        .withMessage('Follower requests notifications must be a boolean'),

    body('messages')
        .optional()
        .isBoolean()
        .withMessage('Messages notifications must be a boolean'),

    body('groupChats')
        .optional()
        .isBoolean()
        .withMessage('Group chats notifications must be a boolean'),

    body('messagePreview')
        .optional()
        .isBoolean()
        .withMessage('Message preview must be a boolean'),

    body('emailNotifications')
        .optional()
        .isBoolean()
        .withMessage('Email notifications must be a boolean'),

    body('weeklyDigest')
        .optional()
        .isBoolean()
        .withMessage('Weekly digest must be a boolean'),

    body('quietHours.enabled')
        .optional()
        .isBoolean()
        .withMessage('Quiet hours enabled must be a boolean'),

    body('quietHours.startTime')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Start time must be in HH:MM format'),

    body('quietHours.endTime')
        .optional()
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('End time must be in HH:MM format')
];

// Security settings validation rules
const securityValidationRules = [
    body('twoFactorEnabled')
        .optional()
        .isBoolean()
        .withMessage('Two factor authentication must be a boolean'),

    body('loginAlerts')
        .optional()
        .isBoolean()
        .withMessage('Login alerts must be a boolean'),

    body('logoutOtherDevices')
        .optional()
        .isBoolean()
        .withMessage('Logout other devices must be a boolean'),

    body('securityQuestionSet')
        .optional()
        .isBoolean()
        .withMessage('Security question set must be a boolean')
];

// Chat settings validation rules
const chatValidationRules = [
    body('readReceipts')
        .optional()
        .isBoolean()
        .withMessage('Read receipts must be a boolean'),

    body('typingIndicators')
        .optional()
        .isBoolean()
        .withMessage('Typing indicators must be a boolean'),

    body('lastSeenInGroups')
        .optional()
        .isBoolean()
        .withMessage('Last seen in groups must be a boolean'),

    body('autoDownloadImages')
        .optional()
        .isIn(['never', 'wifi', 'always'])
        .withMessage('Auto download images must be never, wifi, or always'),

    body('autoDownloadVideos')
        .optional()
        .isIn(['never', 'wifi', 'always'])
        .withMessage('Auto download videos must be never, wifi, or always'),

    body('autoDownloadFiles')
        .optional()
        .isIn(['never', 'wifi', 'always'])
        .withMessage('Auto download files must be never, wifi, or always'),

    body('autoDeleteMessages.enabled')
        .optional()
        .isBoolean()
        .withMessage('Auto delete messages enabled must be a boolean'),

    body('autoDeleteMessages.duration')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('Auto delete duration must be between 1 and 365 days'),

    body('backupChats')
        .optional()
        .isBoolean()
        .withMessage('Backup chats must be a boolean')
];

// Content settings validation rules
const contentValidationRules = [
    body('highQualityUploads')
        .optional()
        .isBoolean()
        .withMessage('High quality uploads must be a boolean'),

    body('compressImages')
        .optional()
        .isBoolean()
        .withMessage('Compress images must be a boolean'),

    body('contentFilter')
        .optional()
        .isIn(['none', 'mild', 'strict'])
        .withMessage('Content filter must be none, mild, or strict'),

    body('hideOffensiveContent')
        .optional()
        .isBoolean()
        .withMessage('Hide offensive content must be a boolean'),

    body('language')
        .optional()
        .isLength({ min: 2, max: 5 })
        .withMessage('Language must be 2-5 characters'),

    body('timezone')
        .optional()
        .isString()
        .withMessage('Timezone must be a string'),

    body('dateFormat')
        .optional()
        .isIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'])
        .withMessage('Date format must be MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD')
];

// Accessibility settings validation rules
const accessibilityValidationRules = [
    body('fontSize')
        .optional()
        .isIn(['small', 'medium', 'large', 'extra-large'])
        .withMessage('Font size must be small, medium, large, or extra-large'),

    body('highContrast')
        .optional()
        .isBoolean()
        .withMessage('High contrast must be a boolean'),

    body('reducedMotion')
        .optional()
        .isBoolean()
        .withMessage('Reduced motion must be a boolean'),

    body('screenReader')
        .optional()
        .isBoolean()
        .withMessage('Screen reader must be a boolean')
];

// App preferences validation rules
const preferencesValidationRules = [
    body('theme')
        .optional()
        .isIn(['light', 'dark', 'auto'])
        .withMessage('Theme must be light, dark, or auto'),

    body('autoPlayVideos')
        .optional()
        .isBoolean()
        .withMessage('Auto play videos must be a boolean'),

    body('soundEnabled')
        .optional()
        .isBoolean()
        .withMessage('Sound enabled must be a boolean'),

    body('hapticFeedback')
        .optional()
        .isBoolean()
        .withMessage('Haptic feedback must be a boolean')
];

// Block user validation rules
const blockUserValidationRules = [
    body('targetUserId')
        .isMongoId()
        .withMessage('Valid target user ID is required'),

    body('reason')
        .optional()
        .isString()
        .isLength({ max: 200 })
        .withMessage('Reason must be a string with maximum 200 characters')
];

// Block keyword validation rules
const blockKeywordValidationRules = [
    body('keyword')
        .isString()
        .isLength({ min: 1, max: 100 })
        .trim()
        .withMessage('Keyword must be between 1 and 100 characters')
];

// Custom validation for quiet hours
const validateQuietHours = (req, res, next) => {
    const { quietHours } = req.body;

    if (quietHours && quietHours.enabled && quietHours.startTime && quietHours.endTime) {
        const startTime = quietHours.startTime;
        const endTime = quietHours.endTime;

        // Basic time format validation (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid time format for quiet hours'
            });
        }
    }

    next();
};

// Validation error handler
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

module.exports = {
    privacyValidationRules,
    notificationValidationRules,
    securityValidationRules,
    chatValidationRules,
    contentValidationRules,
    accessibilityValidationRules,
    preferencesValidationRules,
    blockUserValidationRules,
    blockKeywordValidationRules,
    validateQuietHours,
    handleValidationErrors
};
