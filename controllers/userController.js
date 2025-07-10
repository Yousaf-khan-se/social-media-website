const ResponseHandler = require('../utils/responseHandler');
const userService = require('../services/userService');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');


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

module.exports = {
    updateAuthenticatedUserProfile
};
