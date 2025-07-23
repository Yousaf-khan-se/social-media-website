const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
    try {
        console.log('🔍 Testing MongoDB connection...');
        console.log('📋 MongoDB URI:', process.env.MONGODB_URI ? 'Loaded' : 'Not found');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connection successful!');

        // Test a simple query
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📦 Available collections:', collections.map(c => c.name));

        await mongoose.disconnect();
        console.log('🔌 Disconnected successfully');

    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.error('🔧 Error details:', error);
    }
};

testConnection();
