const app = require('./app');

// For local development
const PORT = process.env.PORT || 5000;

// Start server immediately - database connection handled in server.js
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; // Export for Vercel