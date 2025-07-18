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
    FOLLOW_STATUS_UPDATED: 'Follow status updated successfully',
    CHAT_CREATED: 'Chat created successfully',
    CHAT_DELETED: 'Chat deleted successfully',
    MESSAGE_DELETED: 'Message deleted successfully',
    MEDIA_UPLOADED: 'Media uploaded successfully',
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
    CHAT_NOT_FOUND: 'Chat not found',
    CHAT_CREATION_FAILED: 'Failed to create chat',
    CHAT_DELETE_FAILED: 'Failed to delete chat',
    MESSAGE_NOT_FOUND: 'Message not found',
    MESSAGE_DELETE_FAILED: 'Failed to delete message',
    MEDIA_UPLOAD_FAILED: 'Failed to upload media',
    INVALID_CHAT_DATA: 'Invalid chat data provided',
    PARTICIPANTS_REQUIRED: 'Participants are required',
    INVALID_MESSAGE_TYPE: 'Invalid message type',
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
    INVALID_USER_ID: 'Invalid user ID provided',
    INVALID_CHAT_ID: 'Invalid chat ID provided',
    INVALID_MESSAGE_ID: 'Invalid message ID provided',
    PARTICIPANTS_REQUIRED: 'At least one participant is required',
    INVALID_PARTICIPANTS: 'Invalid participants provided',
    GROUP_NAME_REQUIRED: 'Group name is required for group chats',
    MESSAGE_CONTENT_REQUIRED: 'Message content is required',
    MESSAGE_CONTENT_TOO_LONG: 'Message content cannot exceed 1000 characters',
    INVALID_MESSAGE_TYPE: 'Invalid message type'
};

module.exports = {
    HTTP_STATUS,
    SUCCESS_MESSAGES,
    ERROR_MESSAGES,
    VALIDATION_MESSAGES
};
