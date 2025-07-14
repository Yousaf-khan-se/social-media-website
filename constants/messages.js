// HTTP Status Codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
};

// Success Messages
const SUCCESS_MESSAGES = {
    USER_REGISTERED: 'User registered successfully',
    LOGIN_SUCCESSFUL: 'Login successful',
    PROFILE_FETCHED: 'Profile fetched successfully',
    EMAIL_SENT: 'Email sent successfully',
    POST_CREATED: 'Post created successfully',
    POST_UPDATED: 'Post updated successfully',
    POST_DELETED: 'Post deleted successfully',
    POST_LIKED: 'Post liked successfully',
    POST_UNLIKED: 'Post unliked successfully',
    COMMENT_ADDED: 'Comment added successfully',
    COMMENT_DELETED: 'Comment deleted successfully',
    PROFILE_UPDATED: 'Profile updated successfully',
};

// Error Messages
const ERROR_MESSAGES = {
    EMAIL_ALREADY_EXISTS: 'Email already registered',
    USERNAME_ALREADY_EXISTS: 'Username already taken',
    INVALID_CREDENTIALS: 'Invalid credentials',
    USER_NOT_FOUND: 'User not found',
    REGISTRATION_FAILED: 'Registration failed',
    LOGIN_FAILED: 'Login failed',
    PROFILE_FETCH_FAILED: 'Failed to fetch profile',
    ACCESS_TOKEN_REQUIRED: 'Access token required',
    INVALID_TOKEN: 'Invalid or expired token',
    EMAIL_SEND_FAILED: 'Failed to send email',
    POST_NOT_FOUND: 'Post not found',
    POST_CREATION_FAILED: 'Failed to create post',
    POST_UPDATE_FAILED: 'Failed to update post',
    POST_DELETE_FAILED: 'Failed to delete post',
    NOT_AUTHORIZED: 'Not authorized to perform this action',
    COMMENT_NOT_FOUND: 'Comment not found',
    INVALID_POST_DATA: 'Invalid post data provided',
    IMAGE_UPLOAD_FAILED: 'Failed to upload image',
    INVALID_IMAGE_FORMAT: 'Invalid image format',
    COMMENT_CREATION_FAILED: 'Failed to create comment',
};

// Validation Messages
const VALIDATION_MESSAGES = {
    USERNAME_REQUIRED: 'Username is required',
    EMAIL_REQUIRED: 'Email is required',
    PASSWORD_REQUIRED: 'Password is required',
    FIRST_NAME_REQUIRED: 'First name is required',
    LAST_NAME_REQUIRED: 'Last name is required',
    INVALID_EMAIL: 'Please provide a valid email address',
    PASSWORD_TOO_SHORT: 'Password must be at least 6 characters long',
    USERNAME_TOO_SHORT: 'Username must be at least 3 characters long',
    POST_CONTENT_REQUIRED: 'Post content is required',
    POST_CONTENT_TOO_LONG: 'Post content cannot exceed 2000 characters',
    COMMENT_CONTENT_REQUIRED: 'Comment content is required',
    COMMENT_CONTENT_TOO_LONG: 'Comment cannot exceed 500 characters',
    INVALID_POST_ID: 'Invalid post ID provided',
    INVALID_USER_ID: 'Invalid user ID provided'
};

module.exports = {
    HTTP_STATUS,
    SUCCESS_MESSAGES,
    ERROR_MESSAGES,
    VALIDATION_MESSAGES
};
