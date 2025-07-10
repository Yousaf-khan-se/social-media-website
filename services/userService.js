const User = require('../models/User');
const { ERROR_MESSAGES } = require('../constants/messages');

// Check if user exists by email or username
const findExistingUser = async (email, username) => {
    return await User.findOne({
        $or: [{ email }, { username }]
    });
};

// Create a new user
const createUser = async (userData) => {
    const user = new User(userData);
    await user.save();
    return user;
};

// Find user by email with password
const findUserByEmailWithPassword = async (email) => {
    return await User.findOne({ email }).select('+password');
};

// Find user by ID
const findUserById = async (userId) => {
    return await User.findById(userId);
};

// Update user's last login
const updateLastLogin = async (user) => {
    user.lastLogin = new Date();
    await user.save();
    return user;
};

// Get user profile data (without sensitive fields)
const getUserProfileData = (user) => {
    return user.toJSON();
};

// Check which field conflicts (email or username)
const getConflictError = (existingUser, email) => {
    return existingUser.email === email
        ? ERROR_MESSAGES.EMAIL_ALREADY_EXISTS
        : ERROR_MESSAGES.USERNAME_ALREADY_EXISTS;
};

// Update user profile
const updateUserProfile = async (userId, profileData) => {
    const user = await User.findById(userId);
    if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    Object.assign(user, profileData);
    await user.save();
    return user;
};

module.exports = {
    findExistingUser,
    createUser,
    findUserByEmailWithPassword,
    findUserById,
    updateLastLogin,
    getUserProfileData,
    getConflictError,
    updateUserProfile
};
