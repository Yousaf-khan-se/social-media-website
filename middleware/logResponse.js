module.exports = (req, res, next) => {
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    // Override res.send
    res.send = function (data) {
        logResponseDetails(req, res, data, 'send');
        return originalSend.call(this, data);
    };

    // Override res.json
    res.json = function (data) {
        logResponseDetails(req, res, data, 'json');
        return originalJson.call(this, data);
    };

    // Override res.end
    res.end = function (data) {
        if (data && !res.headersSent) {
            logResponseDetails(req, res, data, 'end');
        }
        return originalEnd.call(this, data);
    };

    next();
};

function logResponseDetails(req, res, data, method) {
    console.log('🟢 Outgoing Response Info');

    console.log(`⬅️ ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`);

    // 📋 Response Headers
    // const headers = res.getHeaders();
    // if (Object.keys(headers).length > 0) {
    //     console.log('📋 Response Headers:', headers);
    // } else {
    //     console.log('📋 Response Headers: None set');
    // }

    // 📦 Response Body
    if (data) {
        try {
            // Try to parse as JSON for better logging
            let parsedData;
            if (typeof data === 'string') {
                try {
                    parsedData = JSON.parse(data);
                } catch (e) {
                    parsedData = data;
                }
            } else {
                parsedData = data;
            }

            console.log('📦 Response Body:', parsedData);
            console.log('📏 Response Size:', Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data)), 'bytes');
        } catch (error) {
            console.log('📦 Response Body: [Unable to log - parse error]');
        }
    } else {
        console.log('📦 Response Body: Empty or undefined');
    }

    // ⏱️ Response Time (if available)
    const responseTime = Date.now() - (req.startTime || Date.now());
    console.log('⏱️ Response Time:', responseTime, 'ms');

    // 🎯 Content Type
    const contentType = res.get('Content-Type');
    if (contentType) {
        console.log('🎯 Content-Type:', contentType);
    }

    // 📊 Status Info
    const statusMessage = getStatusMessage(res.statusCode);
    console.log('📊 Status:', res.statusCode, statusMessage);

    console.log('-----------------------------');
}

function getStatusMessage(statusCode) {
    const statusMessages = {
        200: '✅ OK',
        201: '✅ Created',
        204: '✅ No Content',
        400: '❌ Bad Request',
        401: '🔒 Unauthorized',
        403: '🚫 Forbidden',
        404: '❓ Not Found',
        500: '💥 Internal Server Error',
        502: '🔗 Bad Gateway',
        503: '⏸️ Service Unavailable'
    };

    return statusMessages[statusCode] || '❔ Unknown Status';
}
