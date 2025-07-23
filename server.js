const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const ResponseHandler = require('./utils/responseHandler');
require('dotenv').config();
const logRequest = require('./middleware/logRequest');
const logResponse = require('./middleware/logResponse');

const server = express();

// Simple CORS configuration
const getAllowedOrigins = () => {
    const origins = [];

    // Add frontend URL if set
    if (process.env.FRONTEND_URL) {
        origins.push(process.env.FRONTEND_URL);
    }

    // Add localhost for development
    origins.push('http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'https://social-media-website-frontend-pied.vercel.app');

    return origins;
};

// Simple CORS setup
server.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = getAllowedOrigins();

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Allow if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // In production without FRONTEND_URL, allow all HTTPS origins
        if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
            if (origin.startsWith('https://')) {
                return callback(null, true);
            }
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
server.use(express.json({ limit: '50mb' }));
server.use(express.urlencoded({ extended: true, limit: '50mb' }));
server.use(cookieParser());
server.use(logRequest);
server.use(logResponse);

// Database connection
const connectDB = async () => {
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('MongoDB connected successfully');
        }
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
};

connectDB()

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
    console.log('🔄 Mongoose reconnected to MongoDB');
});

// Routes
server.get('/', (req, res) => {
    return ResponseHandler.success(res, {
        message: 'Social Media Platform API',
        status: 'Server is running',
        environment: process.env.NODE_ENV
    });
});

server.get('/api/health', (req, res) => {
    return ResponseHandler.success(res, {
        status: 'OK',
        uptime: process.uptime()
    });
});

// Import route modules
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const notificationRoutes = require('./routes/notifications');

// Use routes
server.use('/api/auth', authRoutes);
server.use('/api/posts', postRoutes);
server.use('/api/users', userRoutes);
server.use('/api/chats', chatRoutes);
server.use('/api/notifications', notificationRoutes);

// Global error handler
server.use((error, req, res, next) => {
    console.error('Global Error:', error);
    const status = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    return ResponseHandler.error(res, message, status);
});

// 404 handler
server.use('*', (req, res) => {
    return ResponseHandler.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
});

module.exports = server;