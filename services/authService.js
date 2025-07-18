const { generateToken } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');
const { addToBlacklist } = require('../utils/tokenBlacklist');
const userService = require('./userService');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');
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
        user: userService.getUserProfileData(user)
    };
};

const isProduction = process.env.NODE_ENV === 'production';

// Login user
const loginUser = async (res, credentials) => {
    const { email, password } = credentials;

    // Find user by email
    let user = await userService.findUserByEmailWithPassword(email);
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

// Refresh JWT token
const refreshToken = async (refreshToken) => {
    // Note: This is a placeholder - you'll need to implement refresh token logic
    // This would typically verify the refresh token and issue a new access token
    throw new Error('Refresh token functionality not yet implemented');
};

// Forgot password
const forgotPassword = async (email) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists for security
            return { message: 'If email exists, password reset instructions have been sent' };
        }

        // Generate reset token (you'll need to implement this)
        // Send email with reset link (you'll need to implement this)
        return { message: 'Password reset instructions sent to email' };
    } catch (error) {
        throw error;
    }
};

// Reset password
const resetPassword = async (token, newPassword) => {
    // Note: This is a placeholder - you'll need to implement reset token logic
    // This would typically verify the reset token and update the password
    throw new Error('Reset password functionality not yet implemented');
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

        return { message: 'Password changed successfully' };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    logoutUser,
    sendWelcomeEmail,
    refreshToken,
    forgotPassword,
    resetPassword,
    changePassword
};
