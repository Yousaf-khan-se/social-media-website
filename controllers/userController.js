const ResponseHandler = require('../utils/responseHandler');
const userService = require('../services/userService');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');
const { validatePagination } = require('../validators/postValidator');


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
};
