const { VALIDATION_MESSAGES } = require('../constants/messages');

// Validation helper functions
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    return username && username.length >= 3 && username.length <= 20 && usernameRegex.test(username);
};

const isValidPassword = (password) => {
    return password && password.length >= 6;
};

const isValidName = (name) => {
    return name && name.trim().length > 0 && name.trim().length <= 50;
};

const isValidOTP = (otp) => {
    return otp && /^\d{6}$/.test(otp);
};

// Registration validation
const validateRegistration = (data) => {
    const errors = [];
    const { username, email, password, firstName, lastName } = data;

    if (!username) {
        errors.push(VALIDATION_MESSAGES.USERNAME_REQUIRED);
    } else {
        // More specific username validation
        if (username.length < 3) {
            errors.push(VALIDATION_MESSAGES.USERNAME_TOO_SHORT);
        } else if (username.length > 20) {
            errors.push(VALIDATION_MESSAGES.USERNAME_TOO_LONG);
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errors.push(VALIDATION_MESSAGES.USERNAME_INVALID_CHARS);
        }
    }

    if (!email) {
        errors.push(VALIDATION_MESSAGES.EMAIL_REQUIRED);
    } else if (!isValidEmail(email)) {
        errors.push(VALIDATION_MESSAGES.INVALID_EMAIL);
    }

    if (!password) {
        errors.push(VALIDATION_MESSAGES.PASSWORD_REQUIRED);
    } else if (!isValidPassword(password)) {
        errors.push(VALIDATION_MESSAGES.PASSWORD_TOO_SHORT);
    }

    if (!firstName || !isValidName(firstName)) {
        errors.push(VALIDATION_MESSAGES.FIRST_NAME_REQUIRED);
    }

    if (!lastName || !isValidName(lastName)) {
        errors.push(VALIDATION_MESSAGES.LAST_NAME_REQUIRED);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Login validation
const validateLogin = (data) => {
    const errors = [];
    const { username, email, password } = data;

    if (!email && !username) {
        errors.push(VALIDATION_MESSAGES.EMAIL_OR_USERNAME_REQUIRED);
    } else if (email && !isValidEmail(email)) {
        errors.push(VALIDATION_MESSAGES.INVALID_EMAIL);
    }

    if (!password) {
        errors.push(VALIDATION_MESSAGES.PASSWORD_REQUIRED);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Forgot Password validation
const validateForgotPassword = (data) => {
    const errors = [];
    const { email, username } = data;

    if (!email && !username) {
        errors.push(VALIDATION_MESSAGES.EMAIL_OR_USERNAME_REQUIRED);
    }

    if (email && !isValidEmail(email)) {
        errors.push(VALIDATION_MESSAGES.INVALID_EMAIL);
    }

    if (username && !isValidUsername(username)) {
        errors.push(VALIDATION_MESSAGES.USERNAME_TOO_SHORT);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// OTP verification validation
const validateOTPVerification = (data) => {
    const errors = [];
    const { email, otp } = data;

    if (!email) {
        errors.push(VALIDATION_MESSAGES.EMAIL_REQUIRED);
    } else if (!isValidEmail(email)) {
        errors.push(VALIDATION_MESSAGES.INVALID_EMAIL);
    }

    if (!otp) {
        errors.push(VALIDATION_MESSAGES.OTP_REQUIRED);
    } else if (!isValidOTP(otp)) {
        errors.push(VALIDATION_MESSAGES.INVALID_OTP_FORMAT);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Reset password validation
const validateResetPassword = (data) => {
    const errors = [];
    const { otp, newPassword } = data;

    if (!otp) {
        errors.push(VALIDATION_MESSAGES.OTP_REQUIRED);
    } else if (!isValidOTP(otp)) {
        errors.push(VALIDATION_MESSAGES.INVALID_OTP_FORMAT);
    }

    if (!newPassword) {
        errors.push(VALIDATION_MESSAGES.NEW_PASSWORD_REQUIRED);
    } else if (!isValidPassword(newPassword)) {
        errors.push(VALIDATION_MESSAGES.PASSWORD_TOO_SHORT);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    validateRegistration,
    validateLogin,
    validateForgotPassword,
    validateOTPVerification,
    validateResetPassword,
    isValidEmail,
    isValidUsername,
    isValidPassword,
    isValidName,
    isValidOTP
};
