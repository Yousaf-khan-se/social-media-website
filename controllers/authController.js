const authService = require('../services/authService');
const {
    validateRegistration,
    validateLogin,
    validateForgotPassword,
    validateOTPVerification,
    validateResetPassword
} = require('../validators/authValidator');
const ResponseHandler = require('../utils/responseHandler');
const { ERROR_MESSAGES } = require('../constants/messages');

// Register a new user
const register = async (req, res) => {
    try {
        // Validate request data
        const validation = validateRegistration(req.body);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        // Register user through service
        const result = await authService.registerUser(req.body);

        return ResponseHandler.created(res, result);

    } catch (error) {
        console.error('Registration error:', error);

        // Handle known errors
        if (error.message === ERROR_MESSAGES.EMAIL_ALREADY_EXISTS ||
            error.message === ERROR_MESSAGES.USERNAME_ALREADY_EXISTS) {
            return ResponseHandler.badRequest(res, error.message);
        }

        return ResponseHandler.internalError(res, ERROR_MESSAGES.REGISTRATION_FAILED);
    }
};


// Get current user profile
const getProfile = async (req, res) => {
    try {
        const result = await authService.getUserProfile(req.user.userId);
        console.log('Profile fetched successfully:', result);
        return ResponseHandler.success(res, result);

    } catch (error) {
        console.error('Profile fetch error:', error);

        // Handle known errors
        if (error.message === ERROR_MESSAGES.USER_NOT_FOUND) {
            return ResponseHandler.notFound(res, error.message);
        }

        return ResponseHandler.internalError(res, ERROR_MESSAGES.PROFILE_FETCH_FAILED);
    }
};

// Login user
const login = async (req, res) => {
    try {
        // Validate request data
        const validation = validateLogin(req.body);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        // Login user through service
        const result = await authService.loginUser(res, req.body);

        return ResponseHandler.success(res, result);

    } catch (error) {
        console.error('Login error:', error);

        // Handle known errors
        if (error.message === ERROR_MESSAGES.INVALID_CREDENTIALS) {
            return ResponseHandler.unauthorized(res, error.message);
        }

        return ResponseHandler.internalError(res, ERROR_MESSAGES.LOGIN_FAILED);
    }
};

// Logout user
const logout = async (req, res) => {
    try {
        const result = await authService.logoutUser(res, req.token);

        return ResponseHandler.success(res, result);

    } catch (error) {
        console.error('Logout error:', error);
        return ResponseHandler.internalError(res, 'Logout failed');
    }
};

const deleteAccount = async (req, res) => {
    try {
        const result = await authService.deleteUserAccount(req.user.userId);
        return ResponseHandler.success(res, result);

    } catch (error) {
        console.error('Delete account error:', error);
        return ResponseHandler.internalError(res, 'Failed to delete account');
    }
};

// Refresh JWT token
const refreshToken = async (req, res) => {
    try {
        const result = await authService.refreshToken(req.body.refreshToken);
        return ResponseHandler.success(res, result);
    } catch (error) {
        console.error('Token refresh error:', error);
        return ResponseHandler.unauthorized(res, 'Invalid refresh token');
    }
};

// Forgot password
const forgotPassword = async (req, res) => {
    try {
        // Validate request data
        const validation = validateForgotPassword(req.body);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        const { email, username } = req.body;
        const result = await authService.forgotPassword(email, username);

        return ResponseHandler.success(res, result);
    } catch (error) {
        console.error('Forgot password error:', error);
        return ResponseHandler.internalError(res, error.message || ERROR_MESSAGES.PASSWORD_RESET_FAILED);
    }
};

// Verify OTP
const verifyOTP = async (req, res) => {
    try {
        // Validate request data
        const validation = validateOTPVerification(req.body);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        const { email, otp } = req.body;
        const result = await authService.verifyOTP(email, otp);

        return ResponseHandler.success(res, result);
    } catch (error) {
        console.error('OTP verification error:', error);

        // Handle specific OTP errors
        if (error.message.includes('expired') || error.message.includes('not found')) {
            return ResponseHandler.badRequest(res, ERROR_MESSAGES.OTP_EXPIRED);
        }
        if (error.message.includes('Invalid')) {
            return ResponseHandler.badRequest(res, ERROR_MESSAGES.INVALID_OTP);
        }

        return ResponseHandler.internalError(res, error.message || ERROR_MESSAGES.INVALID_OTP);
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        // Validate request data
        const validation = validateResetPassword(req.body);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        const { otp, newPassword } = req.body;
        const result = await authService.resetPassword(otp, newPassword, req);

        return ResponseHandler.success(res, result);
    } catch (error) {
        console.error('Reset password error:', error);

        // Handle specific reset password errors
        if (error.message.includes('Invalid or expired OTP')) {
            return ResponseHandler.badRequest(res, ERROR_MESSAGES.INVALID_OTP);
        }
        if (error.message.includes('not verified')) {
            return ResponseHandler.badRequest(res, ERROR_MESSAGES.OTP_NOT_VERIFIED);
        }

        return ResponseHandler.badRequest(res, error.message || ERROR_MESSAGES.PASSWORD_RESET_FAILED);
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return ResponseHandler.badRequest(res, 'Current password and new password are required');
        }

        const result = await authService.changePassword(req.user.userId, currentPassword, newPassword);
        return ResponseHandler.success(res, result);
    } catch (error) {
        console.error('Change password error:', error);
        if (error.message === 'Invalid current password') {
            return ResponseHandler.badRequest(res, 'Current password is incorrect');
        }
        return ResponseHandler.internalError(res, 'Failed to change password');
    }
};

// Admin endpoint to manually trigger cleanup of deleted users
const cleanupDeletedUsers = async (req, res) => {
    try {
        const result = await authService.cleanupDeletedUsers();
        return ResponseHandler.success(res, result);
    } catch (error) {
        console.error('Manual cleanup error:', error);
        return ResponseHandler.internalError(res, 'Failed to cleanup deleted users');
    }
};

module.exports = {
    register,
    login,
    getProfile,
    logout,
    refreshToken,
    forgotPassword,
    verifyOTP,
    resetPassword,
    changePassword,
    deleteAccount,
    cleanupDeletedUsers
};
