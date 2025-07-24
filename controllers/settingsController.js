const settingsService = require('../services/settingsService');
const ResponseHandler = require('../utils/responseHandler');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');

/**
 * Get user settings
 */
const getUserSettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const settings = await settingsService.getUserSettings(userId);

        return ResponseHandler.success(res, {
            settings,
            message: 'Settings retrieved successfully'
        });
    } catch (error) {
        console.error('Get user settings error:', error);
        return ResponseHandler.internalError(res, 'Failed to retrieve settings');
    }
};

/**
 * Update user settings
 */
const updateUserSettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const updateData = req.body;

        const settings = await settingsService.updateUserSettings(userId, updateData);

        return ResponseHandler.success(res, {
            settings,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Update user settings error:', error);
        return ResponseHandler.internalError(res, 'Failed to update settings');
    }
};

/**
 * Update privacy settings
 */
const updatePrivacySettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const privacyData = req.body;

        const settings = await settingsService.updateUserSettings(userId, { privacy: privacyData });

        return ResponseHandler.success(res, {
            privacy: settings.privacy,
            message: 'Privacy settings updated successfully'
        });
    } catch (error) {
        console.error('Update privacy settings error:', error);
        return ResponseHandler.internalError(res, 'Failed to update privacy settings');
    }
};

/**
 * Update notification settings
 */
const updateNotificationSettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const notificationData = req.body;

        const settings = await settingsService.updateUserSettings(userId, { notifications: notificationData });

        return ResponseHandler.success(res, {
            notifications: settings.notifications,
            message: 'Notification settings updated successfully'
        });
    } catch (error) {
        console.error('Update notification settings error:', error);
        return ResponseHandler.internalError(res, 'Failed to update notification settings');
    }
};

/**
 * Update security settings
 */
const updateSecuritySettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const securityData = req.body;

        // Remove sensitive fields that shouldn't be directly updated
        delete securityData.backupCodes;
        delete securityData.passwordLastChanged;

        const settings = await settingsService.updateUserSettings(userId, { security: securityData });

        return ResponseHandler.success(res, {
            security: settings.security,
            message: 'Security settings updated successfully'
        });
    } catch (error) {
        console.error('Update security settings error:', error);
        return ResponseHandler.internalError(res, 'Failed to update security settings');
    }
};

/**
 * Update chat settings
 */
const updateChatSettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const chatData = req.body;

        const settings = await settingsService.updateUserSettings(userId, { chat: chatData });

        return ResponseHandler.success(res, {
            chat: settings.chat,
            message: 'Chat settings updated successfully'
        });
    } catch (error) {
        console.error('Update chat settings error:', error);
        return ResponseHandler.internalError(res, 'Failed to update chat settings');
    }
};

/**
 * Update content settings
 */
const updateContentSettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const contentData = req.body;

        const settings = await settingsService.updateUserSettings(userId, { content: contentData });

        return ResponseHandler.success(res, {
            content: settings.content,
            message: 'Content settings updated successfully'
        });
    } catch (error) {
        console.error('Update content settings error:', error);
        return ResponseHandler.internalError(res, 'Failed to update content settings');
    }
};

/**
 * Update accessibility settings
 */
const updateAccessibilitySettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const accessibilityData = req.body;

        const settings = await settingsService.updateUserSettings(userId, { accessibility: accessibilityData });

        return ResponseHandler.success(res, {
            accessibility: settings.accessibility,
            message: 'Accessibility settings updated successfully'
        });
    } catch (error) {
        console.error('Update accessibility settings error:', error);
        return ResponseHandler.internalError(res, 'Failed to update accessibility settings');
    }
};

/**
 * Update app preferences
 */
const updatePreferences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const preferencesData = req.body;

        const settings = await settingsService.updateUserSettings(userId, { preferences: preferencesData });

        return ResponseHandler.success(res, {
            preferences: settings.preferences,
            message: 'Preferences updated successfully'
        });
    } catch (error) {
        console.error('Update preferences error:', error);
        return ResponseHandler.internalError(res, 'Failed to update preferences');
    }
};

/**
 * Reset settings to default
 */
const resetSettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { section } = req.body;

        const settings = await settingsService.resetUserSettings(userId, section);

        return ResponseHandler.success(res, {
            settings,
            message: section ? `${section} settings reset to default` : 'All settings reset to default'
        });
    } catch (error) {
        console.error('Reset settings error:', error);
        return ResponseHandler.internalError(res, 'Failed to reset settings');
    }
};

/**
 * Block a user
 */
const blockUser = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { targetUserId, reason } = req.body;

        if (!targetUserId) {
            return ResponseHandler.badRequest(res, 'Target user ID is required');
        }

        const settings = await settingsService.blockUser(userId, targetUserId, reason);

        return ResponseHandler.success(res, {
            blockedUsers: settings.blocked.users,
            message: 'User blocked successfully'
        });
    } catch (error) {
        console.error('Block user error:', error);
        if (error.message === 'Cannot block yourself') {
            return ResponseHandler.badRequest(res, error.message);
        }
        if (error.message === 'User not found') {
            return ResponseHandler.notFound(res, error.message);
        }
        return ResponseHandler.internalError(res, 'Failed to block user');
    }
};

/**
 * Unblock a user
 */
const unblockUser = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { targetUserId } = req.body;

        if (!targetUserId) {
            return ResponseHandler.badRequest(res, 'Target user ID is required');
        }

        const settings = await settingsService.unblockUser(userId, targetUserId);

        return ResponseHandler.success(res, {
            blockedUsers: settings.blocked.users,
            message: 'User unblocked successfully'
        });
    } catch (error) {
        console.error('Unblock user error:', error);
        return ResponseHandler.internalError(res, 'Failed to unblock user');
    }
};

/**
 * Get blocked users
 */
const getBlockedUsers = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 20 } = req.query;

        const result = await settingsService.getBlockedUsers(userId, page, limit);

        return ResponseHandler.success(res, {
            ...result,
            message: 'Blocked users retrieved successfully'
        });
    } catch (error) {
        console.error('Get blocked users error:', error);
        return ResponseHandler.internalError(res, 'Failed to retrieve blocked users');
    }
};

/**
 * Get blocked keywords
 */
const getBlockedKeywords = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 20 } = req.query;

        const result = await settingsService.getBlockedKeywords(userId, page, limit);

        return ResponseHandler.success(res, {
            ...result,
            message: 'Blocked keywords retrieved successfully'
        });
    } catch (error) {
        console.error('Get blocked keywords error:', error);
        return ResponseHandler.internalError(res, 'Failed to retrieve blocked keywords');
    }
};

/**
 * Add blocked keyword
 */
const addBlockedKeyword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { keyword } = req.body;

        if (!keyword) {
            return ResponseHandler.badRequest(res, 'Keyword is required');
        }

        const settings = await settingsService.addBlockedKeyword(userId, keyword);

        return ResponseHandler.success(res, {
            blockedKeywords: settings.blocked.keywords,
            message: 'Keyword blocked successfully'
        });
    } catch (error) {
        console.error('Add blocked keyword error:', error);
        return ResponseHandler.internalError(res, 'Failed to block keyword');
    }
};

/**
 * Remove blocked keyword
 */
const removeBlockedKeyword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { keyword } = req.body;

        if (!keyword) {
            return ResponseHandler.badRequest(res, 'Keyword is required');
        }

        const settings = await settingsService.removeBlockedKeyword(userId, keyword);

        return ResponseHandler.success(res, {
            blockedKeywords: settings.blocked.keywords,
            message: 'Keyword unblocked successfully'
        });
    } catch (error) {
        console.error('Remove blocked keyword error:', error);
        return ResponseHandler.internalError(res, 'Failed to unblock keyword');
    }
};

/**
 * Get settings summary/overview
 */
const getSettingsSummary = async (req, res) => {
    try {
        const userId = req.user.userId;
        const settings = await settingsService.getUserSettings(userId);

        const summary = {
            privacy: {
                profileVisibility: settings.privacy.profileVisibility,
                whoCanMessageMe: settings.privacy.whoCanMessageMe,
                whoCanFollowMe: settings.privacy.whoCanFollowMe
            },
            notifications: {
                pushNotifications: settings.notifications.pushNotifications,
                emailNotifications: settings.notifications.emailNotifications,
                quietHours: settings.notifications.quietHours
            },
            security: {
                twoFactorEnabled: settings.security.twoFactorEnabled,
                loginAlerts: settings.security.loginAlerts,
                passwordLastChanged: settings.security.passwordLastChanged
            },
            blocked: {
                usersCount: settings.blockedUsersCount,
                keywordsCount: settings.blockedKeywordsCount
            },
            preferences: {
                theme: settings.preferences.theme,
                language: settings.content.language
            }
        };

        return ResponseHandler.success(res, {
            summary,
            message: 'Settings summary retrieved successfully'
        });
    } catch (error) {
        console.error('Get settings summary error:', error);
        return ResponseHandler.internalError(res, 'Failed to retrieve settings summary');
    }
};

/**
 * Export user settings
 */
const exportSettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const settings = await settingsService.exportUserSettings(userId);

        // Set appropriate headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="settings-export.json"');

        return res.json({
            success: true,
            data: settings,
            exportedAt: new Date().toISOString(),
            message: 'Settings exported successfully'
        });
    } catch (error) {
        console.error('Export settings error:', error);
        return ResponseHandler.internalError(res, 'Failed to export settings');
    }
};

/**
 * Import user settings
 */
const importSettings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const settingsData = req.body;

        if (!settingsData || typeof settingsData !== 'object') {
            return ResponseHandler.badRequest(res, 'Invalid settings data');
        }

        const settings = await settingsService.importUserSettings(userId, settingsData);

        return ResponseHandler.success(res, {
            settings,
            message: 'Settings imported successfully'
        });
    } catch (error) {
        console.error('Import settings error:', error);
        return ResponseHandler.internalError(res, 'Failed to import settings');
    }
};

module.exports = {
    getUserSettings,
    updateUserSettings,
    updatePrivacySettings,
    updateNotificationSettings,
    updateSecuritySettings,
    updateChatSettings,
    updateContentSettings,
    updateAccessibilitySettings,
    updatePreferences,
    resetSettings,
    blockUser,
    unblockUser,
    getBlockedUsers,
    getBlockedKeywords,
    addBlockedKeyword,
    removeBlockedKeyword,
    getSettingsSummary,
    exportSettings,
    importSettings
};
