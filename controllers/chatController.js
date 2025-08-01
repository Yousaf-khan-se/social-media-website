const chatService = require('../services/chatService');
const chatPermissionService = require('../services/chatPermissionService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ResponseHandler = require('../utils/responseHandler');
const { ERROR_MESSAGES, SUCCESS_MESSAGES, VALIDATION_MESSAGES } = require('../constants/messages');
const { findUserById } = require('../services/userService');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');

// to store chat media files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads');
        // Ensure upload directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename to prevent conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
        files: 10 // max 10 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/mov', 'video/avi'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`), false);
        }
    }
});

// Create a new chat room
const createChat = async (req, res) => {
    try {
        const { participants, isGroup = false, name = '', message = '' } = req.body;
        const userId = req.user.userId;
        console.log('req:', userId);

        // Validation
        if (!participants || !Array.isArray(participants) || participants.length === 0) {
            return ResponseHandler.badRequest(res, VALIDATION_MESSAGES.PARTICIPANTS_REQUIRED);
        }

        // Add current user to participants if not already included
        const allParticipants = [...new Set([userId, ...participants])];

        // For group chats, validate name
        if (isGroup && !name.trim()) {
            return ResponseHandler.badRequest(res, VALIDATION_MESSAGES.GROUP_NAME_REQUIRED);
        }

        // For one-on-one chats, ensure exactly 2 participants
        if (!isGroup && allParticipants.length !== 2) {
            return ResponseHandler.badRequest(res, 'One-on-one chat requires exactly 2 participants');
        }

        // Validate all participants exist
        for (const participantId of allParticipants) {
            const user = await findUserById(participantId);
            if (!user) {
                return ResponseHandler.badRequest(res, `User with ID ${participantId} not found`);
            }
        }

        // For one-on-one chats, check chat permissions
        if (!isGroup) {
            const otherParticipantId = allParticipants.find(id => id !== userId);

            const permissionCheck = await chatPermissionService.checkChatPermission(userId, otherParticipantId);

            if (!permissionCheck.canCreate) {
                if (permissionCheck.requiresPermission) {
                    // Create a permission request
                    try {
                        const permissionRequest = await chatPermissionService.createChatPermissionRequest(
                            userId,
                            otherParticipantId,
                            { participants: allParticipants, isGroup, name },
                            message
                        );

                        return ResponseHandler.success(res, {
                            permissionRequest,
                            message: 'Chat permission request sent. The user will be notified.',
                            requiresPermission: true
                        });
                    } catch (permissionError) {
                        if (permissionError.message.includes('already pending')) {
                            return ResponseHandler.badRequest(res, 'A chat permission request is already pending with this user');
                        }
                        throw permissionError;
                    }
                } else {
                    return ResponseHandler.forbidden(res, permissionCheck.reason);
                }
            }
        }

        // If we reach here, either it's a group chat or permission is granted
        const chatRoom = await chatService.createChatRoom(allParticipants, isGroup, name);

        return ResponseHandler.created(res, {
            chat: chatRoom,
            message: SUCCESS_MESSAGES.CHAT_CREATED
        });

    } catch (error) {
        console.error('Create chat error:', error);
        return ResponseHandler.internalError(res, error.message || ERROR_MESSAGES.CHAT_CREATION_FAILED);
    }
};

// Get all user chats
const getAllUserChats = async (req, res) => {
    try {
        const userId = req.user.userId;
        const chats = await chatService.getUserChats(userId);

        return ResponseHandler.success(res, {
            chats,
            message: 'Chats fetched successfully'
        });

    } catch (error) {
        console.error('Get user chats error:', error);
        return ResponseHandler.internalError(res, error.message || 'Failed to fetch chats');
    }
};

// Get chat by ID with messages
const getChatById = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.userId;
        const { page = 1, limit = 50 } = req.query;

        // Validate roomId
        if (!roomId) {
            return ResponseHandler.badRequest(res, VALIDATION_MESSAGES.INVALID_CHAT_ID);
        }

        // Check if chat exists and user is a participant
        const chatRoom = await ChatRoom.findById(roomId)
            .populate('participants', 'username firstName lastName profilePicture');

        if (!chatRoom) {
            return ResponseHandler.notFound(res, ERROR_MESSAGES.CHAT_NOT_FOUND);
        }

        // Check if user is a participant
        if (!chatRoom.participants.some(p => p._id.toString() === userId)) {
            return ResponseHandler.unauthorized(res, ERROR_MESSAGES.NOT_AUTHORIZED);
        }

        // Get messages with pagination
        const messagesData = await chatService.getChatMessages(roomId, parseInt(page), parseInt(limit), userId);

        return ResponseHandler.success(res, {
            chat: chatRoom,
            messages: messagesData.messages,
            pagination: messagesData.pagination,
            message: 'Chat messages fetched successfully'
        });

    } catch (error) {
        console.error('Get chat by ID error:', error);
        return ResponseHandler.internalError(res, error.message || 'Failed to fetch chat');
    }
};

// Delete a chat room
const deleteChat = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.userId;

        // Validate roomId
        if (!roomId) {
            return ResponseHandler.badRequest(res, VALIDATION_MESSAGES.INVALID_CHAT_ID);
        }

        const result = await chatService.deleteChatRoom(roomId, userId);

        return ResponseHandler.success(res, {
            message: SUCCESS_MESSAGES.CHAT_DELETED,
            success: result
        });

    } catch (error) {
        console.error('Delete chat error:', error);
        if (error.message === 'Chat room not found') {
            return ResponseHandler.notFound(res, ERROR_MESSAGES.CHAT_NOT_FOUND);
        }
        if (error.message === 'Not authorized to delete this chat') {
            return ResponseHandler.unauthorized(res, ERROR_MESSAGES.NOT_AUTHORIZED);
        }
        return ResponseHandler.internalError(res, error.message || ERROR_MESSAGES.CHAT_DELETE_FAILED);
    }
};

// Delete a message
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.userId;

        // Validate messageId
        if (!messageId) {
            return ResponseHandler.badRequest(res, VALIDATION_MESSAGES.INVALID_MESSAGE_ID);
        }

        const result = await chatService.deleteMessage(messageId, userId);

        return ResponseHandler.success(res, {
            message: SUCCESS_MESSAGES.MESSAGE_DELETED
        });

    } catch (error) {
        console.error('Delete message error:', error);
        if (error.message === 'Message not found') {
            return ResponseHandler.notFound(res, ERROR_MESSAGES.MESSAGE_NOT_FOUND);
        }
        if (error.message === 'Not authorized to delete this message') {
            return ResponseHandler.unauthorized(res, ERROR_MESSAGES.NOT_AUTHORIZED);
        }
        return ResponseHandler.internalError(res, error.message || ERROR_MESSAGES.MESSAGE_DELETE_FAILED);
    }
};

// Add media to chat
const addMediaToChat = [
    upload.array('media', 10), // max 10 files
    async (req, res) => {
        try {
            const { roomId } = req.params;
            const mediaFiles = req.files;
            const userId = req.user.userId;

            console.log('Media files received:', mediaFiles?.length || 0);

            // Validate roomId
            if (!roomId) {
                return ResponseHandler.badRequest(res, VALIDATION_MESSAGES.INVALID_CHAT_ID);
            }

            // Check if chat exists and user is a participant
            const chatRoom = await ChatRoom.findById(roomId);
            if (!chatRoom) {
                return ResponseHandler.notFound(res, ERROR_MESSAGES.CHAT_NOT_FOUND);
            }

            // Check if user is a participant
            if (!chatRoom.participants.includes(userId)) {
                return ResponseHandler.unauthorized(res, ERROR_MESSAGES.NOT_AUTHORIZED);
            }

            if (!mediaFiles || mediaFiles.length === 0) {
                return ResponseHandler.badRequest(res, 'No media files uploaded');
            }

            // Validate file types and sizes
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/mov', 'video/avi'];
            const maxImageSize = 10 * 1024 * 1024; // 10MB for images
            const maxVideoSize = 100 * 1024 * 1024; // 100MB for videos

            for (const file of mediaFiles) {
                if (!validTypes.includes(file.mimetype)) {
                    return ResponseHandler.badRequest(res, `Invalid file type: ${file.mimetype}`);
                }

                const isVideo = file.mimetype.startsWith('video/');
                const maxSize = isVideo ? maxVideoSize : maxImageSize;

                if (file.size > maxSize) {
                    return ResponseHandler.badRequest(res, `File too large: ${file.originalname}. Max size: ${maxSize / (1024 * 1024)}MB`);
                }
            }

            const mediaUrls = await chatService.uploadMedia(roomId, mediaFiles);

            return ResponseHandler.success(res, {
                mediaUrls,
                message: `Successfully uploaded ${mediaFiles.length} media file(s)`,
                optimization_applied: true
            });

        } catch (error) {
            console.error('Add media to chat error:', error);

            // Clean up any uploaded files on error
            if (req.files) {
                req.files.forEach(file => {
                    fs.unlink(file.path, () => { });
                });
            }

            return ResponseHandler.internalError(res, error.message || ERROR_MESSAGES.MEDIA_UPLOAD_FAILED);
        }
    }
];

// Get chat permission requests
const getChatPermissionRequests = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type = 'received' } = req.query; // 'received' or 'sent'

        const requests = await chatPermissionService.getChatPermissionRequests(userId, type);

        return ResponseHandler.success(res, {
            requests,
            message: `${type === 'received' ? 'Received' : 'Sent'} chat permission requests fetched successfully`
        });

    } catch (error) {
        console.error('Get chat permission requests error:', error);
        return ResponseHandler.internalError(res, error.message || 'Failed to fetch chat permission requests');
    }
};

// Respond to chat permission request
const respondToChatPermissionRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { response } = req.body; // 'approved' or 'denied'
        const userId = req.user.userId;

        // Validation
        if (!requestId) {
            return ResponseHandler.badRequest(res, 'Request ID is required');
        }

        if (!response || !['approved', 'denied'].includes(response)) {
            return ResponseHandler.badRequest(res, 'Response must be either "approved" or "denied"');
        }

        const result = await chatPermissionService.respondToChatPermissionRequest(requestId, userId, response);

        const message = response === 'approved'
            ? 'Chat permission request approved and chat created successfully'
            : 'Chat permission request denied';

        return ResponseHandler.success(res, {
            ...result,
            message
        });

    } catch (error) {
        console.error('Respond to chat permission request error:', error);
        if (error.message === 'Permission request not found') {
            return ResponseHandler.notFound(res, 'Chat permission request not found');
        }
        if (error.message === 'Not authorized to respond to this request') {
            return ResponseHandler.unauthorized(res, 'Not authorized to respond to this request');
        }
        if (error.message === 'This request has already been responded to') {
            return ResponseHandler.badRequest(res, 'This request has already been responded to');
        }
        return ResponseHandler.internalError(res, error.message || 'Failed to respond to chat permission request');
    }
};

module.exports = {
    createChat,
    getAllUserChats,
    getChatById,
    deleteChat,
    deleteMessage,
    addMediaToChat,
    getChatPermissionRequests,
    respondToChatPermissionRequest
};