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
    return await user.populate([
        { path: 'followers', select: 'username firstName lastName profilePicture isVerified' },
        { path: 'following', select: 'username firstName lastName profilePicture isVerified' }
    ]);
};

// Find user by email with password
const findUserByEmailWithPassword = async (email) => {
    const user = await User.findOne({ email }).select('+password');
    if (!user) return null;
    return await user.populate([
        { path: 'followers', select: 'username firstName lastName profilePicture isVerified' },
        { path: 'following', select: 'username firstName lastName profilePicture isVerified' }
    ]);
};

// Find user by ID
const findUserById = async (userId) => {
    const user = await User.findById(userId);
    if (!user) return null;
    return await user.populate([
        { path: 'followers', select: 'username firstName lastName profilePicture isVerified' },
        { path: 'following', select: 'username firstName lastName profilePicture isVerified' }
    ]);
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
    const user = await User.findByIdAndUpdate(
        userId,
        profileData,
        { new: true, runValidators: true }
    );
    if (!user) return null;
    return await user.populate([
        { path: 'followers', select: 'username firstName lastName profilePicture isVerified' },
        { path: 'following', select: 'username firstName lastName profilePicture isVerified' }
    ]);
};

// Find users by filter (for search)
const findUser = (filter) => {
    return User.find(filter);
};

// Count users by filter (for search pagination)
const countDocuments = async (filter) => {
    return await User.countDocuments(filter);
};

const addFollower = async (userId, followId) => {
    // Add followId to user's following array
    let user = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { following: followId } },
        { new: true }
    );

    // Add userId to followId's followers array
    let updatedFollowedUser = await User.findByIdAndUpdate(
        followId,
        { $addToSet: { followers: userId } },
        { new: true }
    ).select('-password');

    if (!updatedFollowedUser) return null;

    user = await user.populate([
        { path: 'followers', select: 'username firstName lastName profilePicture isVerified' },
        { path: 'following', select: 'username firstName lastName profilePicture isVerified' }
    ]);

    return user;
};

const getUserFollowerIds = async (userId) => {
    try {
        const user = await User.findById(userId).select('followers').lean();
        return user ? user.followers : [];
    } catch (error) {
        console.error('Error fetching user followers:', error);
        throw new Error('Failed to fetch user followers');
    }
};

const getUserFollowingIds = async (userId) => {
    try {
        const user = await User.findById(userId).select('following').lean();
        return user ? user.following : [];
    } catch (error) {
        console.error('Error fetching user followings:', error);
        throw new Error('Failed to fetch user followings');
    }
};

const removeFollower = async (userId, followId) => {
    // Remove followId from user's following array
    let user = await User.findByIdAndUpdate(
        userId,
        { $pull: { following: followId } },
        { new: true }
    );

    // Remove userId from followId's followers array
    let updatedFollowedUser = await User.findByIdAndUpdate(
        followId,
        { $pull: { followers: userId } },
        { new: true }
    ).select('-password');

    if (!updatedFollowedUser) return null;

    user = await user.populate([
        { path: 'followers', select: 'username firstName lastName profilePicture isVerified' },
        { path: 'following', select: 'username firstName lastName profilePicture isVerified' }
    ]);

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
    updateUserProfile,
    findUser,
    countDocuments,
    addFollower,
    removeFollower,
    getUserFollowerIds,
    getUserFollowingIds
};
