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

// Registration validation
const validateRegistration = (data) => {
    const errors = [];
    const { username, email, password, firstName, lastName } = data;

    if (!username) {
        errors.push(VALIDATION_MESSAGES.USERNAME_REQUIRED);
    } else if (!isValidUsername(username)) {
        errors.push(VALIDATION_MESSAGES.USERNAME_TOO_SHORT);
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
    const { email, password } = data;

    if (!email) {
        errors.push(VALIDATION_MESSAGES.EMAIL_REQUIRED);
    } else if (!isValidEmail(email)) {
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

module.exports = {
    validateRegistration,
    validateLogin,
    isValidEmail,
    isValidUsername,
    isValidPassword,
    isValidName
};
