const app = require('./app');
const serverless = require('serverless-http');

// For serverless deployment (AWS Lambda, Vercel, etc.)
module.exports.handler = serverless(app);

// For local development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 Local: http://localhost:${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}