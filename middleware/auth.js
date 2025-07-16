const jwt = require('jsonwebtoken');
const { ERROR_MESSAGES, HTTP_STATUS } = require('../constants/messages');
const ResponseHandler = require('../utils/responseHandler');
const { isTokenBlacklisted } = require('../utils/tokenBlacklist');
const cookie = require('cookie');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = req.cookies.token || (authHeader && authHeader.split(' ')[1]); // Bearer TOKEN

    if (!token) {
        return ResponseHandler.unauthorized(res, ERROR_MESSAGES.ACCESS_TOKEN_REQUIRED);
    }

    try {
        // Check if token is blacklisted
        const isBlacklisted = await isTokenBlacklisted(token);
        if (isBlacklisted) {
            return ResponseHandler.unauthorized(res, 'Token has been invalidated');
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return ResponseHandler.error(res, ERROR_MESSAGES.INVALID_TOKEN, HTTP_STATUS.FORBIDDEN);
            }
            req.user = user;
            req.token = token; // Store token for logout
            next();
        });
    } catch (error) {
        console.error('Error checking token blacklist:', error);
        return ResponseHandler.error(res, 'Authentication error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
};

const authenticateWsToken = async (socket, next) => {
    try {
        const cookieHeader = socket.handshake.headers.cookie;

        if (!cookieHeader) {
            return next(new Error('No cookie sent with WebSocket request'));
        }

        const cookies = cookie.parse(cookieHeader);
        const token = cookies.token;

        if (!token) {
            return next(new Error('Access token required'));
        }

        // Check if token is blacklisted
        const isBlacklisted = await isTokenBlacklisted(token);
        if (isBlacklisted) {
            return next(new Error('Token has been invalidated'));
        }

        // Verify token
        const user = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = user; // Attach user payload to socket for later use
        socket.token = token; // Optional: store token if needed
        console.log('WebSocket authenticated for user:', user);
        next();

    } catch (err) {
        console.error('Socket auth error:', err);
        next(new Error('Authentication failed'));
    }
};


const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

module.exports = {
    authenticateToken,
    authenticateWsToken,
    generateToken
};
