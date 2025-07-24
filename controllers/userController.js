const ResponseHandler = require('../utils/responseHandler');
const userService = require('../services/userService');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');
const { validatePagination } = require('../validators/postValidator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads');
        // Ensure upload directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename to prevent conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
        files: 10 // max 10 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/mov', 'video/avi'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`), false);
        }
    }
});

const uploadProfilePicture = async (req, res) => {
    try {
        const userId = req.user.userId;
        // Use multer single file upload for 'profilePicture' field
        const file = req.file;

        if (!file) {
            return ResponseHandler.badRequest(res, 'No profile picture uploaded');
        }

        // Validate file type and size (image only)
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
        const maxImageSize = 10 * 1024 * 1024; // 10MB

        if (!validTypes.includes(file.mimetype)) {
            // Clean up file
            fs.unlink(file.path, () => { });
            return ResponseHandler.badRequest(res, `Invalid file type: ${file.mimetype}`);
        }
        if (file.size > maxImageSize) {
            fs.unlink(file.path, () => { });
            return ResponseHandler.badRequest(res, `File too large: ${file.originalname}. Max size: 10MB`);
        }

        const profilePicture = await userService.uploadUserProfilePicture(userId, file);

        return ResponseHandler.success(res, {
            profilePicture,
            message: 'Profile picture uploaded successfully',
            optimization_applied: true
        });

    } catch (error) {
        console.error('Profile picture upload error:', error);
        // Clean up uploaded file on error
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        return ResponseHandler.internalError(res, error.message || 'Failed to upload profile picture');
    }
};

// Update user profile
const updateAuthenticatedUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const profileData = req.body;
        const user = await userService.updateUserProfile(userId, profileData);
        return ResponseHandler.success(res, {
            message: SUCCESS_MESSAGES.PROFILE_UPDATED,
            user
        });

    } catch (error) {
        console.error('Profile update error:', error);
        return ResponseHandler.internalError(res, 'Failed to update profile');
    }
};

const addAuthenticatedUserFollowers = async (req, res) => {
    try {
        const userId = req.user.userId;      // The user who is performing the follow
        const followId = req.params.followId; // The user to be followed

        // Add followId to user's following, and userId to followId's followers
        const updatedUser = await userService.addFollower(userId, followId);

        return ResponseHandler.success(res, {
            message: SUCCESS_MESSAGES.FOLLOW_STATUS_UPDATED,
            user: updatedUser
        });

    } catch (error) {
        console.error('Follow update error:', error);
        return ResponseHandler.internalError(res, 'Failed to update follow status');
    }
};

const removeAuthenticatedUserFollowers = async (req, res) => {
    try {
        const userId = req.user.userId;      // The user who is performing the follow
        const followId = req.params.followId; // The user to be followed

        // Add followId to user's following, and userId to followId's followers
        const updatedUser = await userService.removeFollower(userId, followId);

        return ResponseHandler.success(res, {
            message: SUCCESS_MESSAGES.FOLLOW_STATUS_UPDATED,
            user: updatedUser
        });

    } catch (error) {
        console.error('Follow update error:', error);
        return ResponseHandler.internalError(res, 'Failed to update follow status');
    }
};

// Search users
const searchUsers = async (req, res) => {
    try {
        const { query, page, limit } = req.query;

        if (!query || query.trim().length === 0) {
            return ResponseHandler.badRequest(res, 'Search query is required');
        }

        // Validate pagination
        const paginationValidation = validatePagination(page, limit);
        if (!paginationValidation.isValid) {
            return ResponseHandler.validationError(res, paginationValidation.errors);
        }

        // Build search conditions for user fields
        const searchWords = query.trim().split(/\s+/);
        const searchRegexes = searchWords.map(word => new RegExp(word, 'i'));
        const filter = {
            $or: [
                ...searchRegexes.map(r => ({ firstName: r })),
                ...searchRegexes.map(r => ({ lastName: r })),
                ...searchRegexes.map(r => ({ username: r })),
                ...searchRegexes.map(r => ({ email: r })),
                ...searchRegexes.map(r => ({ bio: r }))
            ]
        };

        const skip = (paginationValidation.page - 1) * paginationValidation.limit;
        const profiles = await userService.findUser(filter)
            .select('-password')
            .sort({ isVerified: -1, followers: -1, createdAt: -1 })
            .skip(skip)
            .limit(paginationValidation.limit)
            .lean();

        // Get total count for pagination
        const total = await userService.countDocuments(filter);

        return ResponseHandler.success(res, {
            profiles,
            query: query.trim(),
            pagination: {
                page: paginationValidation.page,
                limit: paginationValidation.limit,
                total
            }
        });

    } catch (error) {
        console.error('Search users error:', error);
        return ResponseHandler.internalError(res, 'Failed to search users');
    }
};

// get following of a user
const getUserFollowing = async (req, res) => {
    try {
        const { query, page, limit } = req.query;
        const userId = req.user.userId;

        // Validate pagination
        const paginationValidation = validatePagination(page, limit);
        if (!paginationValidation.isValid) {
            return ResponseHandler.validationError(res, paginationValidation.errors);
        }

        let filter = { _id: { $in: [] } };

        if (query && query.trim().length > 0) {
            // Build search conditions for user fields
            const searchWords = query.trim().split(/\s+/);
            const searchRegexes = searchWords.map(word => new RegExp(word, 'i'));
            filter = {
                $and: [
                    { _id: { $in: await userService.getUserFollowingIds(userId) } },
                    {
                        $or: [
                            ...searchRegexes.map(r => ({ firstName: r })),
                            ...searchRegexes.map(r => ({ lastName: r })),
                            ...searchRegexes.map(r => ({ username: r })),
                            ...searchRegexes.map(r => ({ email: r })),
                            ...searchRegexes.map(r => ({ bio: r }))
                        ]
                    }
                ]
            };
        } else {
            // If no query, fetch all followings
            filter = { _id: { $in: await userService.getUserFollowingIds(userId) } };
        }

        const skip = (paginationValidation.page - 1) * paginationValidation.limit;
        const profiles = await userService.findUser(filter)
            .select('-password')
            .sort({ isVerified: -1, followers: -1, createdAt: -1 })
            .skip(skip)
            .limit(paginationValidation.limit)
            .lean();

        // Get total count for pagination
        const total = await userService.countDocuments(filter);

        return ResponseHandler.success(res, {
            profiles,
            query: query ? query.trim() : '',
            pagination: {
                page: paginationValidation.page,
                limit: paginationValidation.limit,
                total
            }
        });

    } catch (error) {
        console.error('Get user following error:', error);
        return ResponseHandler.internalError(res, 'Failed to fetch user followings');
    }
};

// get followers of a user
const getUserFollowers = async (req, res) => {
    try {
        const { query, page, limit } = req.query;
        const userId = req.user.userId;

        // Validate pagination
        const paginationValidation = validatePagination(page, limit);
        if (!paginationValidation.isValid) {
            return ResponseHandler.validationError(res, paginationValidation.errors);
        }

        let filter = { _id: { $in: [] } };

        if (query && query.trim().length > 0) {
            // Build search conditions for user fields
            const searchWords = query.trim().split(/\s+/);
            const searchRegexes = searchWords.map(word => new RegExp(word, 'i'));
            filter = {
                $and: [
                    { _id: { $in: await userService.getUserFollowerIds(userId) } },
                    {
                        $or: [
                            ...searchRegexes.map(r => ({ firstName: r })),
                            ...searchRegexes.map(r => ({ lastName: r })),
                            ...searchRegexes.map(r => ({ username: r })),
                            ...searchRegexes.map(r => ({ email: r })),
                            ...searchRegexes.map(r => ({ bio: r }))
                        ]
                    }
                ]
            };
        } else {
            // If no query, fetch all followers
            filter = { _id: { $in: await userService.getUserFollowerIds(userId) } };
        }

        const skip = (paginationValidation.page - 1) * paginationValidation.limit;
        const profiles = await userService.findUser(filter)
            .select('-password')
            .sort({ isVerified: -1, followers: -1, createdAt: -1 })
            .skip(skip)
            .limit(paginationValidation.limit)
            .lean();

        // Get total count for pagination
        const total = await userService.countDocuments(filter);

        return ResponseHandler.success(res, {
            profiles,
            query: query ? query.trim() : '',
            pagination: {
                page: paginationValidation.page,
                limit: paginationValidation.limit,
                total
            }
        });

    } catch (error) {
        console.error('Get user followers error:', error);
        return ResponseHandler.internalError(res, 'Failed to fetch user followers');
    }
};


module.exports = {
    addAuthenticatedUserFollowers,
    removeAuthenticatedUserFollowers,
    updateAuthenticatedUserProfile,
    searchUsers,
    getUserFollowing,
    getUserFollowers,
    uploadProfilePicture,
    upload // Export multer upload instance for use in routes
};
