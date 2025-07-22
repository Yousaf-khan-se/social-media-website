/**
 * Test script for Firebase Push Notifications
 * Run this with: node scripts/test-notifications.js
 */

const mongoose = require('mongoose');
const notificationService = require('../services/notificationService');
const User = require('../models/User');
const Post = require('../models/Post');
const ChatRoom = require('../models/ChatRoom');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

async function testNotifications() {
    try {
        console.log('🧪 Starting notification tests...\n');

        // Test 1: Create test users
        console.log('1. Creating test users...');
        const testUser1 = await User.findOne({ email: 'test1@example.com' }) ||
            await User.create({
                username: 'testuser1',
                email: 'test1@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User1',
                fcmTokens: [{
                    token: 'fake_fcm_token_1',
                    device: 'web'
                }]
            });

        const testUser2 = await User.findOne({ email: 'test2@example.com' }) ||
            await User.create({
                username: 'testuser2',
                email: 'test2@example.com',
                password: 'password123',
                firstName: 'Test',
                lastName: 'User2',
                fcmTokens: [{
                    token: 'fake_fcm_token_2',
                    device: 'web'
                }]
            });

        console.log('✅ Test users created');

        // Test 2: Add FCM Token
        console.log('\n2. Testing FCM token management...');
        await notificationService.addFCMToken(testUser1._id, 'new_fake_token', 'android');
        console.log('✅ FCM token added');

        // Test 3: Test follow notification
        console.log('\n3. Testing follow notification...');
        await notificationService.sendFollowNotification(testUser1._id, testUser2._id);
        console.log('✅ Follow notification sent');

        // Test 4: Test post notification (like)
        console.log('\n4. Testing post like notification...');
        const testPost = await Post.findOne({ author: testUser2._id }) ||
            await Post.create({
                content: 'Test post for notifications',
                author: testUser2._id,
                isPublic: true
            });

        await notificationService.sendPostNotification(
            testPost._id,
            testUser1._id,
            testUser2._id,
            'like'
        );
        console.log('✅ Post like notification sent');

        // Test 5: Test comment notification
        console.log('\n5. Testing post comment notification...');
        await notificationService.sendPostNotification(
            testPost._id,
            testUser1._id,
            testUser2._id,
            'comment',
            { commentContent: 'Great post!' }
        );
        console.log('✅ Post comment notification sent');

        // Test 6: Test share notification
        console.log('\n6. Testing post share notification...');
        await notificationService.sendPostNotification(
            testPost._id,
            testUser1._id,
            testUser2._id,
            'share'
        );
        console.log('✅ Post share notification sent');

        // Test 7: Test chat creation notification
        console.log('\n7. Testing chat creation notification...');
        const testChat = await ChatRoom.create({
            participants: [testUser1._id, testUser2._id],
            isGroup: false
        });

        await notificationService.sendChatCreatedNotification(testChat._id, testUser1._id);
        console.log('✅ Chat creation notification sent');

        // Test 8: Test message notification
        console.log('\n8. Testing message notification...');
        await notificationService.sendMessageNotification(
            testChat._id,
            testUser1._id,
            'Hello! This is a test message.',
            'text'
        );
        console.log('✅ Message notification sent');

        // Test 9: Test group chat notification
        console.log('\n9. Testing group chat notification...');
        const groupChat = await ChatRoom.create({
            participants: [testUser1._id, testUser2._id],
            isGroup: true,
            name: 'Test Group'
        });

        await notificationService.sendChatCreatedNotification(groupChat._id, testUser1._id);
        console.log('✅ Group chat notification sent');

        // Test 10: Test unread count
        console.log('\n10. Testing unread count...');
        const unreadCount = await notificationService.getUnreadNotificationCount(testUser2._id);
        console.log(`✅ Unread count for testUser2: ${unreadCount}`);

        console.log('\n🎉 All notification tests completed successfully!');
        console.log('\n📝 Note: Actual FCM delivery will fail with fake tokens, but notifications are stored in database.');
        console.log('   Check your MongoDB to see the stored notifications.');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        mongoose.disconnect();
    }
}

// Run tests
testNotifications();
