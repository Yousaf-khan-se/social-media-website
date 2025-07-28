const ChatPermissionRequest = require('../models/ChatPermissionRequest');
const Settings = require('../models/Settings');
const User = require('../models/User');
const notificationService = require('./notificationService');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');

/**
 * Check if a user can create a chat with another user
 * @param {string} requesterId - ID of the user requesting to create chat
 * @param {string} recipientId - ID of the user who would receive the chat
 * @returns {Object} - { canCreate: boolean, reason?: string, requiresPermission?: boolean }
 */
const checkChatPermission = async (requesterId, recipientId) => {
    try {
        // Get recipient's settings
        const recipientSettings = await Settings.findOne({ user: recipientId });
        if (!recipientSettings) {
            // If no settings found, default to everyone can message
            return { canCreate: true };
        }

        const messagePermission = recipientSettings.privacy.whoCanMessageMe;

        // If recipient allows everyone to message, allow immediately
        if (messagePermission === 'everyone') {
            return { canCreate: true };
        }

        // If recipient doesn't allow anyone to message, deny
        if (messagePermission === 'nobody') {
            return {
                canCreate: false,
                reason: 'User does not accept messages from anyone',
                requiresPermission: false
            };
        }

        // If recipient only allows followers to message
        if (messagePermission === 'followers') {
            const recipient = await User.findById(recipientId).populate('followers', '_id');
            if (!recipient) {
                return {
                    canCreate: false,
                    reason: 'Recipient not found',
                    requiresPermission: false
                };
            }

            // Check if requester is a follower
            const isFollower = recipient.followers.some(
                follower => follower._id.toString() === requesterId
            );

            if (isFollower) {
                return { canCreate: true };
            } else {
                return {
                    canCreate: false,
                    reason: 'User only accepts messages from followers',
                    requiresPermission: true
                };
            }
        }

        // Default fallback
        return { canCreate: true };

    } catch (error) {
        console.error('Error checking chat permission:', error);
        throw error;
    }
};

/**
 * Create a chat permission request
 * @param {string} requesterId - ID of the user requesting to create chat
 * @param {string} recipientId - ID of the user who would receive the chat
 * @param {Object} chatData - Original chat creation data
 * @param {string} message - Optional message from requester
 * @returns {Object} - Created permission request
 */
const createChatPermissionRequest = async (requesterId, recipientId, chatData, message = '') => {
    try {
        // Check if there's already a pending request
        const existingRequest = await ChatPermissionRequest.findOne({
            requester: requesterId,
            recipient: recipientId,
            status: 'pending'
        });

        if (existingRequest) {
            throw new Error('A chat permission request is already pending with this user');
        }

        // Create the permission request
        const permissionRequest = new ChatPermissionRequest({
            requester: requesterId,
            recipient: recipientId,
            message,
            chatData
        });

        await permissionRequest.save();

        // Get requester details for notification
        const requester = await User.findById(requesterId).select('username firstName lastName');

        // Send notification to recipient
        await notificationService.createNotification({
            recipient: recipientId,
            sender: requesterId,
            type: 'chat_permission_request',
            title: 'Chat Permission Request',
            body: `${requester.firstName} ${requester.lastName} wants to start a chat with you`,
            data: {
                requestId: permissionRequest._id.toString(),
                requesterId: requesterId
            }
        });

        return permissionRequest;

    } catch (error) {
        console.error('Error creating chat permission request:', error);
        throw error;
    }
};

/**
 * Respond to a chat permission request
 * @param {string} requestId - ID of the permission request
 * @param {string} recipientId - ID of the user responding (should be the recipient)
 * @param {string} response - 'approved' or 'denied'
 * @returns {Object} - Updated permission request and created chat (if approved)
 */
const respondToChatPermissionRequest = async (requestId, recipientId, response) => {
    try {
        const permissionRequest = await ChatPermissionRequest.findById(requestId)
            .populate('requester', 'username firstName lastName')
            .populate('recipient', 'username firstName lastName');

        if (!permissionRequest) {
            throw new Error('Permission request not found');
        }

        if (permissionRequest.recipient._id.toString() !== recipientId) {
            throw new Error('Not authorized to respond to this request');
        }

        if (permissionRequest.status !== 'pending') {
            throw new Error('This request has already been responded to');
        }

        // Update the request status
        permissionRequest.status = response;
        permissionRequest.respondedAt = new Date();
        await permissionRequest.save();

        let result = { permissionRequest };

        if (response === 'approved') {
            // Create the chat room using the original chat data
            const chatService = require('./chatService');
            const chatRoom = await chatService.createChatRoom(
                permissionRequest.chatData.participants,
                permissionRequest.chatData.isGroup,
                permissionRequest.chatData.name
            );

            result.chatRoom = chatRoom;

            // Notify the requester that their request was approved
            await notificationService.createNotification({
                recipient: permissionRequest.requester._id,
                sender: recipientId,
                type: 'chat_created',
                title: 'Chat Request Approved',
                body: `${permissionRequest.recipient.firstName} approved your chat request`,
                data: {
                    chatRoomId: chatRoom._id.toString()
                }
            });
        } else {
            // Notify the requester that their request was denied
            await notificationService.createNotification({
                recipient: permissionRequest.requester._id,
                sender: recipientId,
                type: 'message',
                title: 'Chat Request Denied',
                body: `${permissionRequest.recipient.firstName} declined your chat request`,
                data: {}
            });
        }

        return result;

    } catch (error) {
        console.error('Error responding to chat permission request:', error);
        throw error;
    }
};

/**
 * Get pending chat permission requests for a user
 * @param {string} userId - ID of the user
 * @param {string} type - 'received' or 'sent'
 * @returns {Array} - Array of permission requests
 */
const getChatPermissionRequests = async (userId, type = 'received') => {
    try {
        let query = { status: 'pending' };

        if (type === 'received') {
            query.recipient = userId;
        } else {
            query.requester = userId;
        }

        const requests = await ChatPermissionRequest.find(query)
            .populate('requester', 'username firstName lastName profilePicture')
            .populate('recipient', 'username firstName lastName profilePicture')
            .sort({ createdAt: -1 });

        return requests;

    } catch (error) {
        console.error('Error getting chat permission requests:', error);
        throw error;
    }
};

module.exports = {
    checkChatPermission,
    createChatPermissionRequest,
    respondToChatPermissionRequest,
    getChatPermissionRequests
};
