const { VALIDATION_MESSAGES } = require('../constants/messages');
const mongoose = require('mongoose');

// Validate post creation data
const validateCreatePost = (data) => {
    const errors = [];
    const { content, images, tags } = data;

    if (!content || content.trim().length === 0) {
        errors.push(VALIDATION_MESSAGES.POST_CONTENT_REQUIRED);
    } else if (content.length > 2000) {
        errors.push(VALIDATION_MESSAGES.POST_CONTENT_TOO_LONG);
    }

    if (images && Array.isArray(images)) {
        if (images.length > 10) {
            errors.push('Cannot upload more than 10 images per post');
        }
    }

    if (tags && Array.isArray(tags)) {
        if (tags.length > 20) {
            errors.push('Cannot add more than 20 tags per post');
        }

        tags.forEach(tag => {
            if (typeof tag === 'string' && tag.length > 30) {
                errors.push('Tag cannot exceed 30 characters');
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validate post update data
const validateUpdatePost = (data) => {
    const errors = [];
    const { content, tags } = data;

    if (content !== undefined) {
        if (!content || content.trim().length === 0) {
            errors.push(VALIDATION_MESSAGES.POST_CONTENT_REQUIRED);
        } else if (content.length > 2000) {
            errors.push(VALIDATION_MESSAGES.POST_CONTENT_TOO_LONG);
        }
    }

    if (tags && Array.isArray(tags)) {
        if (tags.length > 20) {
            errors.push('Cannot add more than 20 tags per post');
        }

        tags.forEach(tag => {
            if (typeof tag === 'string' && tag.length > 30) {
                errors.push('Tag cannot exceed 30 characters');
            }
        });
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validate comment data
const validateComment = (data) => {
    const errors = [];
    const { content } = data;

    if (!content || content.trim().length === 0) {
        errors.push(VALIDATION_MESSAGES.COMMENT_CONTENT_REQUIRED);
    } else if (content.length > 500) {
        errors.push(VALIDATION_MESSAGES.COMMENT_CONTENT_TOO_LONG);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// Validate post ID
const validatePostId = (postId) => {
    if (!postId) {
        return {
            isValid: false,
            errors: [VALIDATION_MESSAGES.INVALID_POST_ID]
        };
    }

    if (!isValidObjectId(postId)) {
        return {
            isValid: false,
            errors: [VALIDATION_MESSAGES.INVALID_POST_ID]
        };
    }

    return {
        isValid: true,
        errors: []
    };
};

// Validate pagination parameters
const validatePagination = (page, limit) => {
    const errors = [];

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    if (pageNum < 1) {
        errors.push('Page number must be greater than 0');
    }

    if (limitNum < 1 || limitNum > 50) {
        errors.push('Limit must be between 1 and 50');
    }

    return {
        isValid: errors.length === 0,
        errors,
        page: pageNum,
        limit: limitNum
    };
};

module.exports = {
    validateCreatePost,
    validateUpdatePost,
    validateComment,
    validatePostId,
    validatePagination,
    isValidObjectId
};
