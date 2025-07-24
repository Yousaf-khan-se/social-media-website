const Settings = require('../models/Settings');

/**
 * Middleware to filter content based on user's settings
 */
const filterContentBySettings = async (req, res, next) => {
    try {
        if (!req.user) {
            return next();
        }

        const userId = req.user.userId;
        const settings = await Settings.findOne({ user: userId }).lean();

        if (settings) {
            // Add blocked users to request for filtering
            req.blockedUsers = settings.blocked.users.map(block => block.user.toString());

            // Add blocked keywords to request for filtering
            req.blockedKeywords = settings.blocked.keywords.map(keyword => keyword.keyword.toLowerCase());

            // Add privacy settings to request
            req.userPrivacySettings = settings.privacy;
        } else {
            req.blockedUsers = [];
            req.blockedKeywords = [];
            req.userPrivacySettings = null;
        }

        next();
    } catch (error) {
        console.error('Error in content filter middleware:', error);
        // Don't block the request, just continue without filtering
        req.blockedUsers = [];
        req.blockedKeywords = [];
        req.userPrivacySettings = null;
        next();
    }
};

/**
 * Filter posts array based on blocked users and keywords
 */
const filterPosts = (posts, blockedUsers = [], blockedKeywords = []) => {
    if (!Array.isArray(posts)) return posts;

    return posts.filter(post => {
        // Filter out posts from blocked users
        if (blockedUsers.includes(post.author._id?.toString() || post.author.toString())) {
            return false;
        }

        // Filter out posts containing blocked keywords
        if (blockedKeywords.length > 0 && post.content) {
            const contentLower = post.content.toLowerCase();
            const hasBlockedKeyword = blockedKeywords.some(keyword =>
                contentLower.includes(keyword)
            );
            if (hasBlockedKeyword) {
                return false;
            }
        }

        return true;
    });
};

/**
 * Filter users array based on blocked users
 */
const filterUsers = (users, blockedUsers = []) => {
    if (!Array.isArray(users)) return users;

    return users.filter(user => {
        return !blockedUsers.includes(user._id?.toString() || user.toString());
    });
};

/**
 * Filter messages array based on blocked users and keywords
 */
const filterMessages = (messages, blockedUsers = [], blockedKeywords = []) => {
    if (!Array.isArray(messages)) return messages;

    return messages.filter(message => {
        // Filter out messages from blocked users
        if (blockedUsers.includes(message.sender._id?.toString() || message.sender.toString())) {
            return false;
        }

        // Filter out messages containing blocked keywords
        if (blockedKeywords.length > 0 && message.content) {
            const contentLower = message.content.toLowerCase();
            const hasBlockedKeyword = blockedKeywords.some(keyword =>
                contentLower.includes(keyword)
            );
            if (hasBlockedKeyword) {
                return false;
            }
        }

        return true;
    });
};

/**
 * Check if user is visible based on privacy settings
 */
const isUserVisible = (targetUser, viewerUser, viewerPrivacySettings, relationship = null) => {
    if (!viewerPrivacySettings) return true;

    const visibility = viewerPrivacySettings.profileVisibility;

    switch (visibility) {
        case 'private':
            return false;
        case 'followers':
            // Check if viewer is following the target user
            return relationship && relationship.isFollowing;
        case 'public':
        default:
            return true;
    }
};

/**
 * Apply content filtering to response data
 */
const applyContentFilter = (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to apply filtering
    res.json = function (data) {
        if (req.blockedUsers || req.blockedKeywords) {
            // Apply filtering based on response structure
            if (data.success && data.data) {
                if (data.data.posts) {
                    data.data.posts = filterPosts(data.data.posts, req.blockedUsers, req.blockedKeywords);
                }

                if (data.data.users) {
                    data.data.users = filterUsers(data.data.users, req.blockedUsers);
                }

                if (data.data.messages) {
                    data.data.messages = filterMessages(data.data.messages, req.blockedUsers, req.blockedKeywords);
                }

                // Handle single post response
                if (data.data.post && req.blockedUsers.includes(data.data.post.author._id?.toString() || data.data.post.author.toString())) {
                    return originalJson.call(this, {
                        success: false,
                        error: 'Content not available'
                    });
                }

                // Handle single user response
                if (data.data.user && req.blockedUsers.includes(data.data.user._id?.toString())) {
                    return originalJson.call(this, {
                        success: false,
                        error: 'User not found'
                    });
                }
            }
        }

        // Call original json method
        return originalJson.call(this, data);
    };

    next();
};

module.exports = {
    filterContentBySettings,
    filterPosts,
    filterUsers,
    filterMessages,
    isUserVisible,
    applyContentFilter
};
