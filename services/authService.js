const { generateToken } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');
const { addToBlacklist } = require('../utils/tokenBlacklist');
const userService = require('./userService');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');
const { configDotenv } = require('dotenv');

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
    const user = await userService.createUser({
        username,
        email,
        password,
        firstName,
        lastName
    });
    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.firstName);

    return {
        message: SUCCESS_MESSAGES.USER_REGISTERED,
    };
};

// Login user
const loginUser = async (res, credentials) => {
    const { email, password } = credentials;

    // Find user by email
    const user = await userService.findUserByEmailWithPassword(email);
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

    // Generate token
    const token = generateToken({ userId: user._id });

    const origin = req.get('origin') || req.get('referer') || '';
    const isFromLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isProduction = process.env.NODE_ENV === 'production';

    // Cookie settings based on request origin
    const cookieSettings = {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 12, // 12 hours
        secure: false, // Start with false
        sameSite: 'Lax' // Start with Lax
    };

    // Adjust settings for cross-origin requests (localhost → production)
    if (isFromLocalhost && isProduction) {
        cookieSettings.secure = false; // Localhost uses HTTP
        cookieSettings.sameSite = 'None'; // Required for cross-origin
    } else if (isProduction && !isFromLocalhost) {
        cookieSettings.secure = true; // Production to production uses HTTPS
        cookieSettings.sameSite = 'Lax'; // Same-origin is fine
    }

    res.cookie('token', token, cookieSettings);

    return {
        message: SUCCESS_MESSAGES.LOGIN_SUCCESSFUL,
        user: userService.getUserProfileData(user)
    };
};

// Get user profile
const getUserProfile = async (userId) => {
    const user = await userService.findUserById(userId);
    if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }

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
