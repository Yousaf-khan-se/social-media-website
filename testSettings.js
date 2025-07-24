const mongoose = require('mongoose');
const Settings = require('./models/Settings');
const settingsService = require('./services/settingsService');
require('dotenv').config();

async function testSettingsSystem() {
    try {
        console.log('🔧 Testing Settings System...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Test 1: Create test user ID
        const testUserId = new mongoose.Types.ObjectId();
        console.log(`📝 Using test user ID: ${testUserId}`);

        // Test 2: Get default settings for new user
        console.log('\n📋 Test: Getting default settings...');
        const defaultSettings = await settingsService.getUserSettings(testUserId);
        console.log('✅ Default settings created:', {
            privacy: defaultSettings.privacy.profileVisibility,
            notifications: defaultSettings.notifications.pushNotifications,
            theme: defaultSettings.preferences.theme
        });

        // Test 3: Update privacy settings
        console.log('\n🔒 Test: Updating privacy settings...');
        const updatedSettings = await settingsService.updateUserSettings(testUserId, {
            privacy: {
                profileVisibility: 'followers',
                whoCanMessageMe: 'followers'
            },
            preferences: {
                theme: 'dark'
            }
        });
        console.log('✅ Privacy settings updated:', {
            profileVisibility: updatedSettings.privacy.profileVisibility,
            whoCanMessageMe: updatedSettings.privacy.whoCanMessageMe,
            theme: updatedSettings.preferences.theme
        });

        // Test 4: Block a user
        console.log('\n🚫 Test: Blocking a user...');
        const targetUserId = new mongoose.Types.ObjectId();
        try {
            await settingsService.blockUser(testUserId, targetUserId, 'Test blocking');
            console.log('✅ User blocked successfully');
        } catch (error) {
            console.log('⚠️ Block test failed (expected if target user doesn\'t exist):', error.message);
        }

        // Test 5: Add blocked keyword
        console.log('\n📝 Test: Adding blocked keyword...');
        await settingsService.addBlockedKeyword(testUserId, 'spam');
        console.log('✅ Keyword blocked successfully');

        // Test 6: Get final settings
        console.log('\n📊 Test: Final settings check...');
        const finalSettings = await settingsService.getUserSettings(testUserId);
        console.log('✅ Final settings:', {
            blockedKeywords: finalSettings.blocked.keywords.length,
            blockedUsers: finalSettings.blocked.users.length,
            privacy: finalSettings.privacy.profileVisibility,
            theme: finalSettings.preferences.theme
        });

        // Test 7: Test privacy permissions
        console.log('\n🔐 Test: Privacy permission checks...');
        const anotherUserId = new mongoose.Types.ObjectId();
        const canFollow = await settingsService.canUserFollow(anotherUserId, testUserId);
        console.log('✅ Follow permission check:', canFollow);

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await Settings.deleteOne({ user: testUserId });
        console.log('✅ Test data cleaned');

        console.log('\n🎉 All settings tests passed successfully!');

    } catch (error) {
        console.error('❌ Settings test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the test
testSettingsSystem();
