const { generateToken } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');
const { addToBlacklist } = require('../utils/tokenBlacklist');
const userService = require('./userService');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');

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

    // Generate token
    const token = generateToken({ userId: user._id });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.firstName);

    return {
        message: SUCCESS_MESSAGES.USER_REGISTERED,
        token,
        user: userService.getUserProfileData(user)
    };
};

// Login user
const loginUser = async (credentials) => {
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

    return {
        message: SUCCESS_MESSAGES.LOGIN_SUCCESSFUL,
        token,
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

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    logoutUser,
    sendWelcomeEmail
};
