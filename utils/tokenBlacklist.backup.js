const redis = require('redis');
const jwt = require('jsonwebtoken');

// Fallback in-memory blacklist when Redis is unavailable
const memoryBlacklist = new Set();

// Redis client configuration
let client = null;
let isRedisAvailable = false;

// Create Redis client with error handling
const createRedisClient = () => {
    try {
        client = redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: process.env.REDIS_DB || 0,
            retry_unfulfilled_commands: false,
            connect_timeout: 3000,
            lazyConnect: true
        });

        // Handle Redis connection events
        client.on('connect', () => {
            console.log('✅ Connected to Redis server');
            isRedisAvailable = true;
        });

        client.on('error', (err) => {
            console.warn('⚠️ Redis unavailable, using in-memory blacklist');
            isRedisAvailable = false;
        });

        client.on('end', () => {
            isRedisAvailable = false;
        });

        return client;
    } catch (error) {
        console.warn('⚠️ Redis unavailable, using in-memory blacklist');
        isRedisAvailable = false;
        return null;
    }
};

// Initialize Redis client
createRedisClient();

// Connect to Redis with timeout
const connectRedis = async () => {
    if (!client || isRedisAvailable) return;

    try {
        if (!client.isOpen) {
            await Promise.race([
                client.connect(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
                )
            ]);
            isRedisAvailable = true;
        }
    } catch (error) {
        isRedisAvailable = false;
    }
};

// Initialize Redis connection
connectRedis();

// Get token expiration from JWT
const getTokenExpiration = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            return decoded.exp;
        }
        return null;
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

// Add token to blacklist with TTL
const addToBlacklist = async (token) => {
    try {
        await connectRedis();

        const expiration = getTokenExpiration(token);
        const key = `blacklist:${token}`;

        if (expiration) {
            // Set TTL to token expiration time
            const ttl = expiration - Math.floor(Date.now() / 1000);
            if (ttl > 0) {
                await client.setEx(key, ttl, 'blacklisted');
            }
        } else {
            // Default TTL of 2 days if no expiration found
            await client.setEx(key, 2 * 24 * 60 * 60, 'blacklisted');
        }

        console.log('Token added to blacklist');
    } catch (error) {
        console.error('Error adding token to blacklist:', error);
        throw error;
    }
};

// Check if token is blacklisted
const isTokenBlacklisted = async (token) => {
    try {
        await connectRedis();

        const key = `blacklist:${token}`;
        const result = await client.get(key);
        return result !== null;
    } catch (error) {
        console.error('Error checking token blacklist:', error);
        // Return false on error to avoid blocking valid tokens
        return false;
    }
};

// Get blacklist size (for monitoring)
const getBlacklistSize = async () => {
    try {
        await connectRedis();

        const keys = await client.keys('blacklist:*');
        return keys.length;
    } catch (error) {
        console.error('Error getting blacklist size:', error);
        return 0;
    }
};

// Clean up expired tokens (Redis handles this automatically with TTL)
const cleanupExpiredTokens = async () => {
    // Redis automatically removes expired keys, so this is just for monitoring
    try {
        const size = await getBlacklistSize();
        console.log(`Current blacklist size: ${size} tokens`);
        return size;
    } catch (error) {
        console.error('Error during cleanup check:', error);
        return 0;
    }
};

// Graceful shutdown
const closeConnection = async () => {
    try {
        if (client.isOpen) {
            await client.quit();
            console.log('Redis connection closed');
        }
    } catch (error) {
        console.error('Error closing Redis connection:', error);
    }
};

module.exports = {
    addToBlacklist,
    isTokenBlacklisted,
    cleanupExpiredTokens,
    getBlacklistSize,
    closeConnection
};
