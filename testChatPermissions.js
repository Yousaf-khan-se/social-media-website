/**
 * Test script for Chat Permission System
 * 
 * This script demonstrates how the chat permission system works:
 * 1. Check user settings for message permissions
 * 2. Handle permission requests for restricted users
 * 3. Approve/deny permission requests
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Settings = require('./models/Settings');
const ChatPermissionRequest = require('./models/ChatPermissionRequest');
const chatPermissionService = require('./services/chatPermissionService');

// Example usage scenarios
const testChatPermissionSystem = async () => {
    try {
        console.log('🧪 Testing Chat Permission System...\n');

        // Scenario 1: User allows everyone to message
        console.log('📝 Scenario 1: User allows everyone to message');
        const publicUserId = '507f1f77bcf86cd799439011';
        const requesterId = '507f1f77bcf86cd799439012';

        const permission1 = await chatPermissionService.checkChatPermission(requesterId, publicUserId);
        console.log('Permission check result:', permission1);
        console.log('✅ Should allow chat creation immediately\n');

        // Scenario 2: User only allows followers to message (requester is not a follower)
        console.log('📝 Scenario 2: User only allows followers to message (requester is not a follower)');
        const restrictedUserId = '507f1f77bcf86cd799439013';

        const permission2 = await chatPermissionService.checkChatPermission(requesterId, restrictedUserId);
        console.log('Permission check result:', permission2);
        console.log('⏳ Should require permission request\n');

        // Scenario 3: Create a permission request
        console.log('📝 Scenario 3: Creating a permission request');
        if (permission2.requiresPermission) {
            const chatData = {
                participants: [requesterId, restrictedUserId],
                isGroup: false,
                name: ''
            };

            // This would create a permission request in a real scenario
            console.log('Would create permission request with data:', {
                requester: requesterId,
                recipient: restrictedUserId,
                chatData,
                message: 'Hi! I would like to chat with you.'
            });
        }

        console.log('✅ Chat permission system test completed!\n');

        // API Endpoints Documentation
        console.log('📚 Available API Endpoints:');
        console.log('POST /api/chats/create - Create chat (with permission check)');
        console.log('GET /api/chats/permission-requests?type=received - Get received permission requests');
        console.log('GET /api/chats/permission-requests?type=sent - Get sent permission requests');
        console.log('POST /api/chats/permission-requests/:requestId/respond - Respond to permission request');
        console.log('   Body: { "response": "approved" } or { "response": "denied" }');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
};

// Example API request bodies
const exampleRequests = {
    createChat: {
        url: 'POST /api/chats/create',
        body: {
            participants: ['507f1f77bcf86cd799439013'],
            isGroup: false,
            message: 'Hi! I would like to chat with you.' // Optional message for permission requests
        }
    },

    respondToRequest: {
        url: 'POST /api/chats/permission-requests/507f1f77bcf86cd799439014/respond',
        body: {
            response: 'approved' // or 'denied'
        }
    }
};

// User Settings for Message Permissions
const settingsExamples = {
    publicUser: {
        privacy: {
            whoCanMessageMe: 'everyone' // Allow anyone to message
        }
    },

    followersOnly: {
        privacy: {
            whoCanMessageMe: 'followers' // Only followers can message
        }
    },

    noMessages: {
        privacy: {
            whoCanMessageMe: 'nobody' // No one can message
        }
    }
};

console.log('🚀 Chat Permission System Implementation Complete!');
console.log('📖 See the test function above for usage examples.');

module.exports = {
    testChatPermissionSystem,
    exampleRequests,
    settingsExamples
};
