const { generateToken } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');
const { addToBlacklist, invalidateUserSessions } = require('../utils/tokenBlacklist');
const { getRequestInfo } = require('../utils/requestInfo');
const otpStore = require('../utils/otpStore');
const userService = require('./userService');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');
const User = require('../models/User');
const Post = require('../models/Post');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const chatService = require('./chatService');
const postService = require('./postService');
const settingsService = require('./settingsService');
const notificationService = require('./notificationService');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Send welcome email (non-blocking)
const sendWelcomeEmail = async (email, firstName) => {
    try {
        const welcomeEmail = emailTemplates.welcome(firstName);
        await sendEmail({
            to: email,
            ...welcomeEmail
        });
    } catch (emailError) {
        console.error('Welcome email failed:', emailError);
        // Don't throw error - email failure shouldn't break registration
    }
};

// Register a new user
const registerUser = async (userData) => {
    const { username, email, password, firstName, lastName } = userData;

    // Check if user already exists
    const existingUser = await userService.findExistingUser(email, username);
    if (existingUser) {
        throw new Error(userService.getConflictError(existingUser, email));
    }

    // Create new user
    let user = await userService.createUser({
        username,
        email,
        password,
        firstName,
        lastName
    });
    // Fully populate followers and following
    user = await user.populate([
        { path: 'followers', select: 'username firstName lastName profilePicture isVerified' },
        { path: 'following', select: 'username firstName lastName profilePicture isVerified' }
    ]);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.firstName);

    return {
        message: SUCCESS_MESSAGES.USER_REGISTERED,
        // user: userService.getUserProfileData(user)
    };
};

const isProduction = process.env.NODE_ENV === 'production';

// Login user
const loginUser = async (res, credentials) => {
    const { email, username, password } = credentials;

    // Find user by email or username
    let user = await userService.findUserByEmailOrUsernameWithPassword(email, username);
    if (!user) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Update last login
    await userService.updateLastLogin(user);

    // Fully populate followers and following
    user = await user.populate([
        { path: 'followers', select: 'username firstName lastName profilePicture isVerified' },
        { path: 'following', select: 'username firstName lastName profilePicture isVerified' }
    ]);

    // Generate token
    const token = generateToken({ userId: user._id, username: user.username, firstName: user.firstName, lastName: user.lastName, profilePicture: user.profilePicture });

    res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax',
        maxAge: 1000 * 60 * 60 * 12 // 12 hours
    });

    return {
        message: SUCCESS_MESSAGES.LOGIN_SUCCESSFUL,
        user: userService.getUserProfileData(user)
    };
};

// Get user profile
const getUserProfile = async (userId) => {
    let user = await userService.findUserById(userId);
    if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Fully populate followers and following
    user = await user.populate([
        { path: 'followers', select: 'username firstName lastName profilePicture isVerified' },
        { path: 'following', select: 'username firstName lastName profilePicture isVerified' }
    ]);

    return {
        user: userService.getUserProfileData(user)
    };
};

// Logout user (blacklist token)
const logoutUser = async (token) => {
    try {
        // Add token to blacklist
        await addToBlacklist(token);

        return {
            message: 'Logout successful'
        };
    } catch (error) {
        console.error('Logout error:', error);
        throw new Error('Logout failed');
    }
};

const deleteUserAccount = async (userId) => {
    try {
        console.log(`Starting soft delete process for user: ${userId}`);

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (user.deleted) {
            return { message: 'Account already deleted' };
        }

        // 1. Delete all posts of the user
        console.log('Deleting user posts...');
        const userPosts = await Post.find({ author: userId });
        for (const post of userPosts) {
            try {
                await postService.deletePost(post._id);
            } catch (postError) {
                console.error(`Error deleting post ${post._id}:`, postError);
            }
        }

        // 2. Remove all interactions by the user (comments, likes, shares)
        console.log('Removing user interactions...');
        await Promise.allSettled([
            // Remove user's likes from all posts
            Post.updateMany(
                { 'likes.user': userId },
                { $pull: { likes: { user: userId } } }
            ),
            // Remove user's shares from all posts
            Post.updateMany(
                { 'shares.user': userId },
                { $pull: { shares: { user: userId } } }
            ),
            // Remove user's comments from all posts
            Post.updateMany(
                { 'comments.user': userId },
                { $pull: { comments: { user: userId } } }
            ),
            // Remove user's comment likes
            Post.updateMany(
                { 'comments.likes.user': userId },
                { $pull: { 'comments.$[].likes': { user: userId } } }
            ),
            // Remove user's comment replies
            Post.updateMany(
                { 'comments.replies.user': userId },
                { $pull: { 'comments.$[].replies': { user: userId } } }
            )
        ]);

        // 3. Update user settings to isolate them
        console.log('Updating user settings...');
        try {
            await Settings.findOneAndUpdate(
                { user: userId }, // Changed from userId to user
                {
                    'privacy.profileVisibility': 'private',
                    'privacy.whoCanMessageMe': 'nobody',
                    'privacy.whoCanFollowMe': 'manual_approval',
                    'notifications.emailNotifications': false,
                    'notifications.pushNotifications': false,
                    'notifications.smsNotifications': false
                },
                { upsert: true }
            );
        } catch (settingsError) {
            console.error('Error updating settings:', settingsError);
        }

        // 4. Remove all FCM tokens
        console.log('Removing FCM tokens...');
        user.fcmTokens = [];

        // 5. Clear sensitive data and update identifying fields
        console.log('Updating user data for deletion...');

        // Generate a unique deleted username (keep it under 20 characters)
        const timestamp = new Date().getTime().toString().slice(-8); // Last 8 digits of timestamp
        const deletedUsername = `deleted_${timestamp}`;

        // Update user fields while respecting schema constraints
        user.email = `deleted_${timestamp}@deleted.local`; // Provide a valid email format
        user.password = 'deleted_account_password_hash'; // Provide a valid password (will be meaningless)
        user.username = deletedUsername; // Keep under 20 characters
        user.bio = 'Account deleted';
        user.lastName = `${user.lastName.substring(0, 15)} (deleted)`.substring(0, 50); // Ensure it fits in 50 chars

        // 6. Remove all followings and followers
        console.log('Removing follow relationships...');
        const userFollowers = [...user.followers];
        const userFollowing = [...user.following];

        // Remove this user from other users' following lists
        await User.updateMany(
            { following: userId },
            { $pull: { following: userId } }
        );

        // Remove this user from other users' followers lists
        await User.updateMany(
            { followers: userId },
            { $pull: { followers: userId } }
        );

        // Clear user's own following and followers arrays
        user.followers = [];
        user.following = [];

        // 7. Set isOnline to false
        user.isOnline = false;
        user.lastSeen = new Date();

        // 8. Mark as deleted
        user.deleted = true;

        // Save user changes (skip validation for deleted accounts)
        await user.save({ validateBeforeSave: false });

        // 9. Handle chat rooms and messages
        console.log('Processing chat rooms and messages...');

        // Get all chat rooms where user is a participant
        const userChatRooms = await ChatRoom.find({ participants: userId });

        // Delete chat rooms for this user
        console.log('Processing user chat rooms...');
        for (const chatRoom of userChatRooms) {
            try {
                await chatService.deleteChatRoom(chatRoom._id, userId);
            } catch (chatError) {
                console.error(`Error deleting chat room ${chatRoom._id}:`, chatError);
                // Continue with other chat rooms even if one fails
            }
        }

        // Delete messages sent by this user
        console.log('Processing user messages...');
        try {
            await chatService.deleteUserMessages(userId);
        } catch (messageError) {
            console.error('Error processing user messages:', messageError);
        }

        // 10. Delete all notifications for the user
        console.log('Deleting user notifications...');
        await Promise.allSettled([
            // Delete notifications sent to this user
            Notification.deleteMany({ recipient: userId }),
            // Delete notifications sent by this user
            Notification.deleteMany({ sender: userId })
        ]);

        console.log(`Soft delete completed for user: ${userId}`);
        return { message: 'Account deleted successfully' };

    } catch (error) {
        console.error('Delete account error:', error);
        throw new Error(`Failed to delete account: ${error.message}`);
    }
};

// Refresh JWT token
const refreshToken = async (refreshToken) => {
    // Note: This is a placeholder - you'll need to implement refresh token logic
    // This would typically verify the refresh token and issue a new access token
    throw new Error('Refresh token functionality not yet implemented');
};

// Forgot password - Send OTP
const forgotPassword = async (email, username) => {
    try {
        // Find user by email or username
        const user = await userService.findUserByEmailOrUsernameWithPassword(email, username);
        if (!user || user.deleted) {
            throw new Error('Invalid username or email!');
        }

        // Generate and store OTP
        const otp = otpStore.storeOTP(user.email, user.username);

        // Send OTP email
        try {
            const otpEmail = emailTemplates.passwordResetOTP(user.fullName, otp);
            await sendEmail({
                to: user.email,
                ...otpEmail
            });

            console.log(`Password reset OTP sent to ${user.email} for user ${user.username}`);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);
            // Remove OTP if email failed
            otpStore.removeOTP(user.email);
            throw new Error('Failed to send reset email. Please try again later.');
        }

        return {
            message: SUCCESS_MESSAGES.PASSWORD_RESET_OTP_SENT
        };
    } catch (error) {
        console.error('Forgot password error:', error);
        throw error;
    }
};

// Verify OTP
const verifyOTP = async (email, otp) => {
    try {
        // Verify OTP
        const verificationResult = otpStore.verifyOTP(email, otp);

        if (!verificationResult.success) {
            throw new Error(verificationResult.message);
        }

        return {
            message: SUCCESS_MESSAGES.OTP_VERIFIED_SUCCESSFULLY,
            email: email,
            username: otpStore.getOTPUsername(email)
        };
    } catch (error) {
        console.error('OTP verification error:', error);
        throw error;
    }
};

// Reset password with OTP
const resetPassword = async (otp, newPassword, req) => {
    try {
        // Find the email associated with this OTP
        let userEmail = null;
        let user = null;

        // Search through stored OTPs to find matching one
        // Note: This is a simple implementation. In production, you might want to optimize this
        for (const [email, otpData] of otpStore.otps.entries()) {
            if (otpStore.isOTPActive(email, otp)) {
                userEmail = email;
                break;
            }
        }

        if (!userEmail) {
            throw new Error('Invalid or expired OTP');
        }

        // Find user by email
        user = await User.findOne({ email: userEmail });
        if (!user || user.deleted) {
            throw new Error('User not found, Account does not exist or has been deleted!');
        }

        // Hash the new password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        user.password = hashedPassword;
        await user.save();

        // IMPORTANT: Invalidate ALL active sessions for this user for security
        await invalidateUserSessions(user._id.toString());
        console.log(`All active sessions invalidated for user ${user.username} after password reset`);

        // Remove the used OTP
        otpStore.removeOTP(userEmail);

        // Get request information for security email
        const requestInfo = getRequestInfo(req);

        // Send password reset confirmation email
        try {
            const confirmationEmail = emailTemplates.passwordResetSuccess(
                user.firstName,
                requestInfo.deviceInfo,
                requestInfo.location,
                requestInfo.timestamp
            );

            await sendEmail({
                to: user.email,
                ...confirmationEmail
            });

            console.log(`Password reset successful for user ${user.username} from ${requestInfo.deviceInfo} at ${requestInfo.location}`);
        } catch (emailError) {
            console.error('Failed to send password reset confirmation email:', emailError);
            // Don't throw error here as password was already reset successfully
        }

        return {
            message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESSFUL
        };
    } catch (error) {
        console.error('Reset password error:', error);
        throw error;
    }
};

// Change password
const changePassword = async (userId, currentPassword, newPassword) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new Error('Invalid current password');
        }

        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        user.password = hashedNewPassword;
        await user.save();

        // IMPORTANT: Invalidate ALL active sessions for this user for security
        await invalidateUserSessions(user._id.toString());
        console.log(`All active sessions invalidated for user ${user.username} after password change`);

        return { message: 'Password changed successfully' };
    } catch (error) {
        throw error;
    }
};

// Periodic cleanup service to permanently delete users who have been soft deleted
// and have no remaining connections
const cleanupDeletedUsers = async () => {
    try {
        console.log('Starting cleanup of deleted users...');

        // Find all users marked as deleted
        const deletedUsers = await User.find({ deleted: true });

        if (deletedUsers.length === 0) {
            console.log('No deleted users found for cleanup');
            return { message: 'No deleted users to cleanup', count: 0 };
        }

        let cleanedUpCount = 0;

        for (const user of deletedUsers) {
            try {
                console.log(`Checking if user ${user._id} can be permanently deleted...`);

                // Check if user has any remaining connections
                const [
                    chatRooms,
                    messages,
                    posts,
                    likesOnPosts,
                    commentsOnPosts,
                    sharesOnPosts,
                    notifications,
                    followers,
                    following
                ] = await Promise.all([
                    // Check if user is still in any chat rooms
                    ChatRoom.countDocuments({ participants: user._id }),

                    // Check if user has any messages (even soft deleted ones)
                    Message.countDocuments({
                        $or: [
                            { sender: user._id },
                            { 'deletedFor': { $ne: user._id } } // Messages not deleted by this user
                        ]
                    }),

                    // Check if user has any posts
                    Post.countDocuments({ author: user._id }),

                    // Check if user has any likes on posts
                    Post.countDocuments({ 'likes.user': user._id }),

                    // Check if user has any comments on posts
                    Post.countDocuments({
                        $or: [
                            { 'comments.user': user._id },
                            { 'comments.replies.user': user._id }
                        ]
                    }),

                    // Check if user has any shares on posts
                    Post.countDocuments({ 'shares.user': user._id }),

                    // Check if user has any notifications
                    Notification.countDocuments({
                        $or: [
                            { recipient: user._id },
                            { sender: user._id }
                        ]
                    }),

                    // Check if user still has followers
                    User.countDocuments({ followers: user._id }),

                    // Check if user still follows anyone
                    User.countDocuments({ following: user._id })
                ]);

                const totalConnections = chatRooms + messages + posts + likesOnPosts +
                    commentsOnPosts + sharesOnPosts + notifications +
                    followers + following;

                console.log(`User ${user._id} has ${totalConnections} remaining connections`);

                if (totalConnections === 0) {
                    // User has no remaining connections, safe to delete permanently
                    console.log(`Permanently deleting user ${user._id}...`);

                    // Delete user's settings
                    await Settings.deleteOne({ user: user._id });

                    // Delete the user permanently
                    await User.findByIdAndDelete(user._id);

                    cleanedUpCount++;
                    console.log(`User ${user._id} permanently deleted`);
                } else {
                    console.log(`User ${user._id} still has connections, keeping for now`);
                }

            } catch (userError) {
                console.error(`Error processing deleted user ${user._id}:`, userError);
            }
        }

        console.log(`Cleanup completed. ${cleanedUpCount} users permanently deleted.`);
        return {
            message: 'Cleanup completed',
            count: cleanedUpCount,
            totalDeleted: deletedUsers.length
        };

    } catch (error) {
        console.error('Cleanup deleted users error:', error);
        throw new Error('Failed to cleanup deleted users');
    }
};

// Schedule periodic cleanup (call this function to set up the schedule)
const scheduleUserCleanup = () => {
    // Run cleanup every 7 days (7 * 24 * 60 * 60 * 1000 milliseconds)
    const CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000;

    console.log('Scheduling periodic user cleanup every 7 days...');

    setInterval(async () => {
        try {
            console.log('Running scheduled user cleanup...');
            await cleanupDeletedUsers();
        } catch (error) {
            console.error('Scheduled cleanup failed:', error);
        }
    }, CLEANUP_INTERVAL);

    // Also run initial cleanup on startup
    setTimeout(async () => {
        try {
            console.log('Running initial user cleanup...');
            await cleanupDeletedUsers();
        } catch (error) {
            console.error('Initial cleanup failed:', error);
        }
    }, 5000); // Wait 5 seconds after startup
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    logoutUser,
    sendWelcomeEmail,
    refreshToken,
    forgotPassword,
    verifyOTP,
    resetPassword,
    changePassword,
    deleteUserAccount,
    cleanupDeletedUsers,
    scheduleUserCleanup
};
