const rateLimitStore = new Map();

/**
 * Simple in-memory rate limiter for notifications
 * @param {string} userId - User ID to rate limit
 * @param {number} maxNotifications - Maximum notifications per window
 * @param {number} windowMs - Time window in milliseconds (default: 1 minute)
 * @returns {boolean} - Whether the user is within rate limits
 */
const checkNotificationRateLimit = (userId, maxNotifications = 10, windowMs = 60000) => {
    const now = Date.now();
    const userKey = `notifications:${userId}`;

    if (!rateLimitStore.has(userKey)) {
        rateLimitStore.set(userKey, { count: 1, resetTime: now + windowMs });
        return true;
    }

    const userLimit = rateLimitStore.get(userKey);

    // Reset if window has passed
    if (now >= userLimit.resetTime) {
        rateLimitStore.set(userKey, { count: 1, resetTime: now + windowMs });
        return true;
    }

    // Check if under limit
    if (userLimit.count < maxNotifications) {
        userLimit.count++;
        return true;
    }

    // Rate limit exceeded
    console.warn(`Notification rate limit exceeded for user ${userId}`);
    return false;
};

/**
 * Clean up expired rate limit entries (call periodically)
 */
const cleanupRateLimit = () => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (now >= value.resetTime) {
            rateLimitStore.delete(key);
        }
    }
};

// Clean up every 5 minutes
setInterval(cleanupRateLimit, 5 * 60 * 1000);

module.exports = {
    checkNotificationRateLimit,
    cleanupRateLimit
};
