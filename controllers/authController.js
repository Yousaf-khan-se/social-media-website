const authService = require('../services/authService');
const { validateRegistration, validateLogin } = require('../validators/authValidator');
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

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const result = await authService.getUserProfile(req.user.userId);

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

// Logout user
const logout = async (req, res) => {
    try {
        const result = await authService.logoutUser(req.token);

        return ResponseHandler.success(res, result);

    } catch (error) {
        console.error('Logout error:', error);
        return ResponseHandler.internalError(res, 'Logout failed');
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
        const { email } = req.body;
        if (!email) {
            return ResponseHandler.badRequest(res, 'Email is required');
        }

        const result = await authService.forgotPassword(email);
        return ResponseHandler.success(res, result);
    } catch (error) {
        console.error('Forgot password error:', error);
        return ResponseHandler.internalError(res, 'Failed to process password reset request');
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return ResponseHandler.badRequest(res, 'Token and new password are required');
        }

        const result = await authService.resetPassword(token, newPassword);
        return ResponseHandler.success(res, result);
    } catch (error) {
        console.error('Reset password error:', error);
        return ResponseHandler.badRequest(res, 'Invalid or expired reset token');
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

module.exports = {
    register,
    login,
    getProfile,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    changePassword
};
