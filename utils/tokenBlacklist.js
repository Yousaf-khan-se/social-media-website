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
            lazyConnect: true,
            socket: {
                reconnectStrategy: false // Disable automatic reconnection
            }
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

// Connect to Redis with timeout (no infinite retries)
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

// Get token expiration from JWT
const getTokenExpiration = (token) => {
    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            return decoded.exp;
        }
        return null;
    } catch (error) {
        return null;
    }
};

// Add token to blacklist with TTL
const addToBlacklist = async (token) => {
    try {
        // Try Redis first (only if available)
        if (isRedisAvailable && client) {
            const expiration = getTokenExpiration(token);
            const key = `blacklist:${token}`;

            if (expiration) {
                const ttl = expiration - Math.floor(Date.now() / 1000);
                if (ttl > 0) {
                    await client.setEx(key, ttl, 'blacklisted');
                    return;
                }
            } else {
                await client.setEx(key, 7 * 24 * 60 * 60, 'blacklisted');
                return;
            }
        }
    } catch (error) {
        isRedisAvailable = false;
    }

    // Fallback to in-memory storage
    memoryBlacklist.add(token);
};

// Check if token is blacklisted
const isTokenBlacklisted = async (token) => {
    try {
        // Try Redis first (only if available)
        if (isRedisAvailable && client) {
            const key = `blacklist:${token}`;
            const result = await client.get(key);
            return result !== null;
        }
    } catch (error) {
        isRedisAvailable = false;
    }

    // Fallback to in-memory storage
    return memoryBlacklist.has(token);
};

// Get blacklist size (for monitoring)
const getBlacklistSize = async () => {
    try {
        if (isRedisAvailable && client) {
            const keys = await client.keys('blacklist:*');
            return keys.length;
        }
    } catch (error) {
        isRedisAvailable = false;
    }

    return memoryBlacklist.size;
};

// Clean up expired tokens
const cleanupExpiredTokens = async () => {
    try {
        const size = await getBlacklistSize();
        const storage = isRedisAvailable ? 'Redis' : 'in-memory';
        console.log(`Current blacklist size: ${size} tokens (${storage})`);
        return size;
    } catch (error) {
        return 0;
    }
};

// Graceful shutdown
const closeConnection = async () => {
    try {
        if (client && client.isOpen) {
            await client.quit();
            console.log('Redis connection closed');
        }
    } catch (error) {
        // Ignore errors during shutdown
    }
};

module.exports = {
    addToBlacklist,
    isTokenBlacklisted,
    cleanupExpiredTokens,
    getBlacklistSize,
    closeConnection
};
