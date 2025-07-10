const ResponseHandler = require('../utils/responseHandler');
const authService = require('../services/authService');

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const profileData = req.body;
        const result = await authService.updateUserProfile(userId, profileData);
        return ResponseHandler.success(res, result);
    } catch (error) {
        console.error('Profile update error:', error);
        return ResponseHandler.internalError(res, 'Failed to update profile');
    }
};

module.exports = {
    updateProfile
};
