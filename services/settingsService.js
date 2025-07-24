const Settings = require('../models/Settings');
const User = require('../models/User');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');

/**
 * Get user settings with fallback to defaults
 */
const getUserSettings = async (userId) => {
    try {
        let settings = await Settings.getOrCreateForUser(userId);
        return settings;
    } catch (error) {
        console.error('Error getting user settings:', error);
        throw error;
    }
};

/**
 * Update user settings
 */
const updateUserSettings = async (userId, updateData) => {
    try {
        let settings = await Settings.getOrCreateForUser(userId);

        // Update nested objects properly
        if (updateData.privacy) {
            settings.privacy = { ...settings.privacy.toObject(), ...updateData.privacy };
        }

        if (updateData.notifications) {
            // Handle nested quietHours separately
            if (updateData.notifications.quietHours) {
                settings.notifications.quietHours = {
                    ...settings.notifications.quietHours.toObject(),
                    ...updateData.notifications.quietHours
                };
                delete updateData.notifications.quietHours;
            }
            settings.notifications = { ...settings.notifications.toObject(), ...updateData.notifications };
        }

        if (updateData.security) {
            settings.security = { ...settings.security.toObject(), ...updateData.security };
        }

        if (updateData.chat) {
            // Handle nested autoDeleteMessages separately
            if (updateData.chat.autoDeleteMessages) {
                settings.chat.autoDeleteMessages = {
                    ...settings.chat.autoDeleteMessages.toObject(),
                    ...updateData.chat.autoDeleteMessages
                };
                delete updateData.chat.autoDeleteMessages;
            }
            settings.chat = { ...settings.chat.toObject(), ...updateData.chat };
        }

        if (updateData.content) {
            settings.content = { ...settings.content.toObject(), ...updateData.content };
        }

        if (updateData.accessibility) {
            settings.accessibility = { ...settings.accessibility.toObject(), ...updateData.accessibility };
        }

        if (updateData.preferences) {
            settings.preferences = { ...settings.preferences.toObject(), ...updateData.preferences };
        }

        await settings.save();

        return settings;
    } catch (error) {
        console.error('Error updating user settings:', error);
        throw error;
    }
};

/**
 * Update notification settings in User model (for backward compatibility)
 */
/**
 * Reset settings to defaults
 */
const resetUserSettings = async (userId, section = null) => {
    try {
        if (section) {
            // Reset specific section
            const settings = await Settings.getOrCreateForUser(userId);
            const defaultSettings = new Settings({ user: userId });

            switch (section) {
                case 'privacy':
                    settings.privacy = defaultSettings.privacy;
                    break;
                case 'notifications':
                    settings.notifications = defaultSettings.notifications;
                    break;
                case 'security':
                    settings.security = defaultSettings.security;
                    break;
                case 'chat':
                    settings.chat = defaultSettings.chat;
                    break;
                case 'content':
                    settings.content = defaultSettings.content;
                    break;
                case 'accessibility':
                    settings.accessibility = defaultSettings.accessibility;
                    break;
                case 'preferences':
                    settings.preferences = defaultSettings.preferences;
                    break;
                default:
                    throw new Error('Invalid settings section');
            }

            await settings.save();
            return settings;
        } else {
            // Reset all settings
            await Settings.findOneAndDelete({ user: userId });
            const newSettings = await Settings.getOrCreateForUser(userId);

            return newSettings;
        }
    } catch (error) {
        console.error('Error resetting user settings:', error);
        throw error;
    }
};

/**
 * Block a user
 */
const blockUser = async (userId, targetUserId, reason = '') => {
    try {
        if (userId === targetUserId) {
            throw new Error('Cannot block yourself');
        }

        // Check if target user exists
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            throw new Error('User not found');
        }

        const settings = await Settings.getOrCreateForUser(userId);
        await settings.blockUser(targetUserId, reason);

        // Also unfollow the user if following
        await User.updateOne(
            { _id: userId },
            { $pull: { following: targetUserId } }
        );

        await User.updateOne(
            { _id: targetUserId },
            { $pull: { followers: userId } }
        );

        return settings;
    } catch (error) {
        console.error('Error blocking user:', error);
        throw error;
    }
};

/**
 * Unblock a user
 */
const unblockUser = async (userId, targetUserId) => {
    try {
        const settings = await Settings.getOrCreateForUser(userId);
        await settings.unblockUser(targetUserId);

        return settings;
    } catch (error) {
        console.error('Error unblocking user:', error);
        throw error;
    }
};

/**
 * Get blocked users list
 */
const getBlockedUsers = async (userId, page = 1, limit = 20) => {
    try {
        const settings = await Settings.findOne({ user: userId })
            .populate({
                path: 'blocked.users.user',
                select: 'username firstName lastName profilePicture',
                options: {
                    skip: (page - 1) * limit,
                    limit: parseInt(limit)
                }
            });

        if (!settings) {
            return { blockedUsers: [], totalCount: 0 };
        }

        const blockedUsers = settings.blocked.users || [];
        const totalCount = blockedUsers.length;

        return {
            blockedUsers: blockedUsers.slice((page - 1) * limit, page * limit),
            totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit)
        };
    } catch (error) {
        console.error('Error getting blocked users:', error);
        throw error;
    }
};

/**
 * Get blocked keywords list
 */
const getBlockedKeywords = async (userId, page = 1, limit = 20) => {
    try {
        const settings = await Settings.findOne({ user: userId }).select('blocked.keywords');

        if (!settings) {
            return { blockedKeywords: [], totalCount: 0, currentPage: parseInt(page), totalPages: 0 };
        }

        const blockedKeywords = settings.blocked.keywords || [];
        const totalCount = blockedKeywords.length;
        const skip = (page - 1) * limit;
        const paginatedKeywords = blockedKeywords.slice(skip, skip + parseInt(limit));

        return {
            blockedKeywords: paginatedKeywords,
            totalCount,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit)
        };
    } catch (error) {
        console.error('Error getting blocked keywords:', error);
        throw error;
    }
};

/**
 * Add blocked keyword
 */
const addBlockedKeyword = async (userId, keyword) => {
    try {
        if (!keyword || keyword.trim().length === 0) {
            throw new Error('Keyword is required');
        }

        const settings = await Settings.getOrCreateForUser(userId);
        await settings.addBlockedKeyword(keyword.trim());

        return settings;
    } catch (error) {
        console.error('Error adding blocked keyword:', error);
        throw error;
    }
};

/**
 * Remove blocked keyword
 */
const removeBlockedKeyword = async (userId, keyword) => {
    try {
        const settings = await Settings.getOrCreateForUser(userId);
        await settings.removeBlockedKeyword(keyword);

        return settings;
    } catch (error) {
        console.error('Error removing blocked keyword:', error);
        throw error;
    }
};

/**
 * Check if user can message another user
 */
const canUserMessage = async (senderId, recipientId) => {
    try {
        // Check if sender is blocked by recipient
        const recipientSettings = await Settings.findOne({ user: recipientId });

        if (recipientSettings && recipientSettings.isUserBlocked(senderId)) {
            return { canMessage: false, reason: 'You are blocked by this user' };
        }

        // Check messaging permissions
        if (recipientSettings && recipientSettings.privacy.whoCanMessageMe !== 'everyone') {
            if (recipientSettings.privacy.whoCanMessageMe === 'nobody') {
                return { canMessage: false, reason: 'This user does not accept messages' };
            }

            if (recipientSettings.privacy.whoCanMessageMe === 'followers') {
                const recipient = await User.findById(recipientId);
                if (!recipient || !recipient.followers.includes(senderId)) {
                    return { canMessage: false, reason: 'Only followers can message this user' };
                }
            }
        }

        return { canMessage: true };
    } catch (error) {
        console.error('Error checking message permissions:', error);
        return { canMessage: false, reason: 'Unable to verify permissions' };
    }
};

/**
 * Check if user can follow another user
 */
const canUserFollow = async (followerId, targetUserId) => {
    try {
        // Check if follower is blocked by target
        const targetSettings = await Settings.findOne({ user: targetUserId });

        if (targetSettings && targetSettings.isUserBlocked(followerId)) {
            return { canFollow: false, reason: 'You are blocked by this user' };
        }

        // Check follow permissions
        if (targetSettings && targetSettings.privacy.whoCanFollowMe === 'manual_approval') {
            return { canFollow: false, reason: 'This user requires manual approval for followers', requiresApproval: true };
        }

        return { canFollow: true };
    } catch (error) {
        console.error('Error checking follow permissions:', error);
        return { canFollow: false, reason: 'Unable to verify permissions' };
    }
};

/**
 * Export user settings
 */
const exportUserSettings = async (userId) => {
    try {
        const settings = await Settings.findOne({ user: userId })
            .populate('blocked.users.user', 'username firstName lastName')
            .lean();

        if (!settings) {
            const defaultSettings = new Settings({ user: userId });
            return defaultSettings.toObject();
        }

        // Remove sensitive data
        delete settings._id;
        delete settings.user;
        delete settings.security.backupCodes;
        delete settings.createdAt;
        delete settings.updatedAt;

        return settings;
    } catch (error) {
        console.error('Error exporting user settings:', error);
        throw error;
    }
};

/**
 * Import user settings
 */
const importUserSettings = async (userId, settingsData) => {
    try {
        const settings = await Settings.getOrCreateForUser(userId);

        // Validate and update settings
        const allowedSections = ['privacy', 'notifications', 'chat', 'content', 'accessibility', 'preferences'];

        for (const section of allowedSections) {
            if (settingsData[section]) {
                settings[section] = { ...settings[section].toObject(), ...settingsData[section] };
            }
        }

        // Don't import security settings or blocked users for security reasons

        await settings.save();

        return settings;
    } catch (error) {
        console.error('Error importing user settings:', error);
        throw error;
    }
};

module.exports = {
    getUserSettings,
    updateUserSettings,
    resetUserSettings,
    blockUser,
    unblockUser,
    getBlockedUsers,
    getBlockedKeywords,
    addBlockedKeyword,
    removeBlockedKeyword,
    canUserMessage,
    canUserFollow,
    exportUserSettings,
    importUserSettings
};
