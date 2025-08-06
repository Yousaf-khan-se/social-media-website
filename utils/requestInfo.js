// Utility functions for extracting request information

// Extract device information from user agent
const getDeviceInfo = (userAgent) => {
    if (!userAgent) {
        return 'Unknown Device';
    }

    // Mobile devices
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        if (/iPhone/i.test(userAgent)) return 'iPhone';
        if (/iPad/i.test(userAgent)) return 'iPad';
        if (/Android/i.test(userAgent)) return 'Android Device';
        if (/BlackBerry/i.test(userAgent)) return 'BlackBerry';
        return 'Mobile Device';
    }

    // Desktop browsers
    if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) {
        return 'Chrome Browser';
    }
    if (/Firefox/i.test(userAgent)) return 'Firefox Browser';
    if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'Safari Browser';
    if (/Edge/i.test(userAgent)) return 'Microsoft Edge';
    if (/Opera/i.test(userAgent)) return 'Opera Browser';

    return 'Desktop Computer';
};

// Extract approximate location from IP (basic implementation)
// In production, you might want to use a proper geolocation service
const getLocationInfo = (req) => {
    // Get IP address
    const ip = req.ip ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
        req.headers['x-forwarded-for']?.split(',')[0] ||
        'Unknown';

    // For localhost/development
    if (ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost')) {
        return 'Local Development Environment';
    }

    // For production, you could integrate with a geolocation service
    // For now, we'll just return the IP
    return `IP: ${ip}`;
};

// Get formatted timestamp
const getFormattedTimestamp = () => {
    return new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
};

// Get request information for security emails
const getRequestInfo = (req) => {
    return {
        deviceInfo: getDeviceInfo(req.headers['user-agent']),
        location: getLocationInfo(req),
        timestamp: getFormattedTimestamp(),
        ip: req.ip || req.connection.remoteAddress || 'Unknown'
    };
};

module.exports = {
    getDeviceInfo,
    getLocationInfo,
    getFormattedTimestamp,
    getRequestInfo
};
