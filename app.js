const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const ResponseHandler = require('./utils/responseHandler');
require('dotenv').config();
const logRequest = require('./middleware/logRequest');
const logResponse = require('./middleware/logResponse');

const app = express();

// Simple CORS setup
app.use(cors({
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(logRequest);
app.use(logResponse);

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

// Initialize database connection
connectDB();

// Routes
app.get('/', (req, res) => {
    return ResponseHandler.success(res, {
        message: 'Social Media Platform API',
        status: 'Server is running',
        environment: process.env.NODE_ENV
    });
});

app.get('/api/health', (req, res) => {
    return ResponseHandler.success(res, {
        status: 'OK',
        uptime: process.uptime()
    });
});

// Import route modules
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
// const userRoutes = require('./routes/users');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
// app.use('/api/users', userRoutes);

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global Error:', error);
    const status = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    return ResponseHandler.error(res, message, status);
});

// 404 handler
app.use('*', (req, res) => {
    return ResponseHandler.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
});

module.exports = app;