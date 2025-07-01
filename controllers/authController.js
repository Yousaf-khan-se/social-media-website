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
        const result = await authService.loginUser(req.body);

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

module.exports = {
    register,
    login,
    getProfile,
    logout
};
