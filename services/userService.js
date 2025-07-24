const User = require('../models/User');
const { ERROR_MESSAGES } = require('../constants/messages');
const settingsService = require('./settingsService');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

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
    // Check if user can follow the target user
    const canFollow = await settingsService.canUserFollow(userId, followId);
    if (!canFollow.canFollow) {
        throw new Error(canFollow.reason);
    }

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

    // Send notification for new follower
    const notificationService = require('./notificationService');
    notificationService.sendFollowNotification(userId, followId)
        .catch(err => console.error('Follow notification error:', err));

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


// Upload a new user profile picture, update User model, and remove old picture from Cloudinary if present
const uploadUserProfilePicture = async (userId, file) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND || 'User not found');
    }

    // Remove old profile picture from Cloudinary if it exists and is a Cloudinary URL
    if (user.profilePicture && user.profilePicture.startsWith('https://res.cloudinary.com/')) {
        try {
            await deleteMediaFromCloudinaryByUrl(user.profilePicture, 'image');
        } catch (err) {
            console.error('Failed to delete old profile picture:', err);
        }
    }

    // Only allow image files
    if (!file.mimetype.startsWith('image/')) {
        throw new Error('Only image files are allowed for profile picture');
    }

    // Cloudinary upload config for profile picture
    const uploadConfig = {
        resource_type: 'image',
        quality: 'auto:eco', // or 'auto:good' if quality > performance is priority
        flags: 'any_format',
        eager: [
            // Specifically optimized size for circular profile display
            {
                width: 100,
                height: 100,
                crop: 'thumb',         // Smart crop + face detection
                gravity: 'face',       // Crop around face if possible
                radius: 'max',         // Make it perfectly circular
                format: 'webp',
                quality: 'auto:best'
            },
            // High-res fallback or larger version for retina displays
            {
                width: 400,
                height: 400,
                crop: 'thumb',
                gravity: 'face',
                format: 'webp',
                quality: 'auto:best'
            },
            {
                format: 'avif',
                quality: 'auto:best'
            }
        ],
        fetch_format: 'auto',
        progressive: true,
        strip_transformations: true,
        cache_control: 'max-age=31536000',
        backup: true,
        folder: `users/${userId}/profile`,
        public_id: `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        overwrite: true,
        type: 'upload',
        tags: ['user_profile', userId],
        notification_url: process.env.CLOUDINARY_WEBHOOK_URL,
        context: {
            alt: `Profile picture for user ${userId}`,
            caption: `Uploaded at ${new Date().toISOString()}`
        }
    };

    const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            uploadConfig,
            function (error, result) {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
        fs.createReadStream(file.path).pipe(stream);
    });

    // Clean up local file
    fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting local file:', err);
    });

    // Update user profilePicture field
    user.profilePicture = result.secure_url;
    await user.save();

    // Return populated user
    return user.profilePicture;
};


// Delete media from Cloudinary by public_id
const deleteMediaFromCloudinary = async (publicId, resourceType = 'image') => {
    try {
        console.log(`Deleting from Cloudinary - Public ID: ${publicId}, Resource Type: ${resourceType}`);

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true // Invalidate CDN cache
        });

        console.log(`Cloudinary deletion result for ${publicId}:`, result);

        // Cloudinary returns { result: 'ok' } for successful deletions
        // or { result: 'not found' } if the resource doesn't exist
        return result;
    } catch (error) {
        console.error(`Error deleting ${publicId} from Cloudinary:`, error);
        throw error;
    }
};

//helper functions for upcoming service____________
const extractPublicIdFromUrl = (url) => {
    try {
        // Handle different Cloudinary URL formats
        // Format 1: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
        // Format 2: https://res.cloudinary.com/cloud_name/image/upload/folder/filename.jpg
        // Format 3: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/filename.jpg
        // Format 4: https://res.cloudinary.com/cloud_name/image/upload/filename.jpg

        // First, remove the base URL and get the path after '/upload/'
        const uploadMatch = url.match(/\/upload\/(.+)$/);
        if (!uploadMatch) {
            throw new Error('Invalid Cloudinary URL format');
        }

        let pathAfterUpload = uploadMatch[1];

        // Remove version number if present (starts with 'v' followed by digits)
        pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

        // Remove file extension
        const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');

        console.log(`Extracted public_id: ${publicId} from URL: ${url}`);
        return publicId;
    } catch (error) {
        console.error('Error extracting public_id from URL:', error);
        return null;
    }
};

// Function to detect resource type from URL
const detectResourceTypeFromUrl = (url) => {
    if (url.includes('/video/upload/')) {
        return 'video';
    } else if (url.includes('/image/upload/')) {
        return 'image';
    } else if (url.includes('/raw/upload/')) {
        return 'raw';
    }
    // Default to image if can't detect
    return 'image';
};

//________________________________
const deleteMediaFromCloudinaryByUrl = async (url, resourceType = null) => {
    try {
        const publicId = extractPublicIdFromUrl(url);

        if (!publicId) {
            throw new Error(`Could not extract public_id from URL: ${url}`);
        }

        // Auto-detect resource type if not provided
        if (!resourceType) {
            resourceType = detectResourceTypeFromUrl(url);
        }

        return await deleteMediaFromCloudinary(publicId, resourceType);
    } catch (error) {
        console.error(`Error deleting media by URL ${url}:`, error);
        throw error;
    }
}


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
    getUserFollowingIds,
    deleteMediaFromCloudinary,
    uploadUserProfilePicture
};
