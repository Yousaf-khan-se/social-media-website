const mongoose = require('mongoose');
const Settings = require('./models/Settings');
const User = require('./models/User');
require('dotenv').config();

/**
 * Migration script to create default settings for existing users
 */
const migrateUserSettings = async () => {
    try {
        console.log('🔧 Starting settings migration...');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all users who don't have settings yet
        const usersWithoutSettings = await User.find({
            _id: {
                $nin: await Settings.distinct('user')
            }
        }).select('_id username');

        console.log(`📊 Found ${usersWithoutSettings.length} users without settings`);

        if (usersWithoutSettings.length === 0) {
            console.log('🎉 All users already have settings!');
            return;
        }

        // Create default settings for each user
        const settingsToCreate = usersWithoutSettings.map(user => ({
            user: user._id,
            // All other fields will use schema defaults
        }));

        // Batch insert settings
        const createdSettings = await Settings.insertMany(settingsToCreate);
        console.log(`✅ Created settings for ${createdSettings.length} users`);

        // Verify migration
        const totalSettings = await Settings.countDocuments();
        const totalUsers = await User.countDocuments();

        console.log(`📈 Total users: ${totalUsers}`);
        console.log(`📈 Total settings: ${totalSettings}`);

        if (totalSettings >= totalUsers) {
            console.log('🎉 Migration completed successfully!');
        } else {
            console.log('⚠️ Some users may still be missing settings');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
};

/**
 * Migration script to sync notification settings from User model to Settings model
 */
const syncNotificationSettings = async () => {
    try {
        console.log('🔧 Starting notification settings sync...');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get all users with their notification settings
        const users = await User.find({}).select('_id notificationSettings');
        console.log(`📊 Found ${users.length} users to sync`);

        let syncedCount = 0;

        for (const user of users) {
            try {
                // Get or create settings for this user
                let settings = await Settings.findOne({ user: user._id });

                if (!settings) {
                    settings = new Settings({ user: user._id });
                }

                // Sync notification settings if they exist in the user model
                if (user.notificationSettings) {
                    const userNotifSettings = user.notificationSettings;

                    // Map the fields that exist in both models
                    if (userNotifSettings.likes !== undefined) {
                        settings.notifications.likes = userNotifSettings.likes;
                    }
                    if (userNotifSettings.comments !== undefined) {
                        settings.notifications.comments = userNotifSettings.comments;
                    }
                    if (userNotifSettings.shares !== undefined) {
                        settings.notifications.shares = userNotifSettings.shares;
                    }
                    if (userNotifSettings.follows !== undefined) {
                        settings.notifications.follows = userNotifSettings.follows;
                    }
                    if (userNotifSettings.messages !== undefined) {
                        settings.notifications.messages = userNotifSettings.messages;
                    }
                    if (userNotifSettings.groupChats !== undefined) {
                        settings.notifications.groupChats = userNotifSettings.groupChats;
                    }

                    await settings.save();
                    syncedCount++;
                }
            } catch (error) {
                console.error(`❌ Failed to sync settings for user ${user._id}:`, error.message);
            }
        }

        console.log(`✅ Synced notification settings for ${syncedCount} users`);
        console.log('🎉 Notification sync completed!');

    } catch (error) {
        console.error('❌ Notification sync failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
};

/**
 * Migration script to clean up duplicate settings
 */
const cleanupDuplicateSettings = async () => {
    try {
        console.log('🔧 Starting duplicate settings cleanup...');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find duplicate settings (multiple settings for same user)
        const duplicates = await Settings.aggregate([
            {
                $group: {
                    _id: '$user',
                    count: { $sum: 1 },
                    docs: { $push: '$_id' }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        console.log(`📊 Found ${duplicates.length} users with duplicate settings`);

        let cleanedCount = 0;

        for (const duplicate of duplicates) {
            try {
                // Keep the first settings document, remove the rest
                const docsToRemove = duplicate.docs.slice(1);

                await Settings.deleteMany({
                    _id: { $in: docsToRemove }
                });

                cleanedCount += docsToRemove.length;
                console.log(`🧹 Cleaned ${docsToRemove.length} duplicate settings for user ${duplicate._id}`);
            } catch (error) {
                console.error(`❌ Failed to clean duplicates for user ${duplicate._id}:`, error.message);
            }
        }

        console.log(`✅ Removed ${cleanedCount} duplicate settings`);
        console.log('🎉 Cleanup completed!');

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
};

/**
 * Migration script to remove notificationSettings field from User model
 */
const removeNotificationSettingsFromUsers = async () => {
    try {
        console.log('🔧 Starting removal of notificationSettings from User model...');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Remove notificationSettings field from all users
        const result = await User.updateMany(
            { notificationSettings: { $exists: true } },
            { $unset: { notificationSettings: 1 } }
        );

        console.log(`✅ Removed notificationSettings from ${result.modifiedCount} users`);
        console.log('🎉 User model cleanup completed!');

    } catch (error) {
        console.error('❌ User model cleanup failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
};

/**
 * Full migration - run all migration steps
 */
const runFullMigration = async () => {
    console.log('🚀 Starting full settings migration...\n');

    await migrateUserSettings();
    console.log('\n' + '='.repeat(50) + '\n');

    await syncNotificationSettings();
    console.log('\n' + '='.repeat(50) + '\n');

    await cleanupDuplicateSettings();
    console.log('\n' + '='.repeat(50) + '\n');

    await removeNotificationSettingsFromUsers();

    console.log('\n🎉 Full migration completed successfully!');
};

// Export functions for individual use
module.exports = {
    migrateUserSettings,
    syncNotificationSettings,
    cleanupDuplicateSettings,
    removeNotificationSettingsFromUsers,
    runFullMigration
};

// If script is run directly, execute full migration
if (require.main === module) {
    const command = process.argv[2];

    switch (command) {
        case 'create':
            migrateUserSettings();
            break;
        case 'sync':
            syncNotificationSettings();
            break;
        case 'cleanup':
            cleanupDuplicateSettings();
            break;
        case 'remove-notif':
            removeNotificationSettingsFromUsers();
            break;
        case 'full':
        default:
            runFullMigration();
            break;
    }
}
