const admin = require('../config/firebase');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Send push notification using Firebase Cloud Messaging
 * @param {string} userId - Recipient user ID
 * @param {Object} notification - Notification data
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} notification.data - Additional data payload
 * @param {string} notification.type - Notification type
 * @param {string} notification.senderId - Sender user ID
 */
const sendPushNotification = async (userId, notification) => {
    try {
        // Get user's FCM tokens
        const user = await User.findById(userId).select('fcmTokens notificationSettings');
        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
            return null;
        }

        // Check if user has enabled this type of notification
        const notificationType = notification.type;
        const notificationKey = getNotificationKey(notificationType);

        if (notificationKey && !user.notificationSettings[notificationKey]) {
            return null;
        }

        // Prepare FCM message
        const tokens = user.fcmTokens.map(tokenObj => tokenObj.token);
        const fcmMessage = {
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: {
                type: notification.type,
                ...notification.data
            },
            tokens: tokens
        };

        // Add platform-specific options
        fcmMessage.android = {
            notification: {
                icon: 'ic_notification',
                color: '#1976D2',
                sound: 'default',
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            }
        };

        fcmMessage.apns = {
            payload: {
                aps: {
                    badge: await getUnreadNotificationCount(userId),
                    sound: 'default'
                }
            }
        };

        fcmMessage.webpush = {
            notification: {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                requireInteraction: false
            }
        };

        // Send notification via FCM - Use sendEachForMulticast or sendToMultipleTokens based on SDK version
        let response;
        try {
            // Try the newer method first
            if (admin.messaging().sendEachForMulticast) {
                response = await admin.messaging().sendEachForMulticast(fcmMessage);
            } else if (admin.messaging().sendMulticast) {
                response = await admin.messaging().sendMulticast(fcmMessage);
            } else {
                // Fallback to sending individual messages
                const promises = tokens.map(token => {
                    const message = {
                        ...fcmMessage,
                        token: token
                    };
                    delete message.tokens;
                    return admin.messaging().send(message).catch(err => ({ error: err }));
                });

                const results = await Promise.allSettled(promises);
                response = {
                    successCount: results.filter(r => r.status === 'fulfilled' && !r.value.error).length,
                    failureCount: results.filter(r => r.status === 'rejected' || r.value.error).length,
                    responses: results.map(r => ({
                        success: r.status === 'fulfilled' && !r.value.error,
                        messageId: r.status === 'fulfilled' ? r.value : null,
                        error: r.status === 'rejected' ? r.reason : r.value.error
                    }))
                };
            }
        } catch (error) {
            console.error('FCM send error:', error);
            response = {
                successCount: 0,
                failureCount: tokens.length,
                responses: tokens.map(() => ({ success: false, error: error.message }))
            };
        }

        // Save notification to database
        const notificationDoc = new Notification({
            recipient: userId,
            sender: notification.senderId,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            data: notification.data,
            isDelivered: response.successCount > 0,
            deliveredAt: response.successCount > 0 ? new Date() : null,
            fcmResponse: {
                messageId: response.responses[0]?.messageId,
                error: response.responses[0]?.error?.message || response.responses[0]?.error
            }
        });

        await notificationDoc.save();

        // Handle failed tokens (expired/invalid)
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });

            // Remove invalid tokens
            if (failedTokens.length > 0) {
                await removeInvalidTokens(userId, failedTokens);
            }
        }

        return {
            success: response.successCount > 0,
            delivered: response.successCount,
            failed: response.failureCount,
            notificationId: notificationDoc._id
        };
    } catch (error) {
        console.error('Error sending push notification:', error);

        // Still save the notification even if FCM fails
        try {
            const notificationDoc = new Notification({
                recipient: userId,
                sender: notification.senderId,
                type: notification.type,
                title: notification.title,
                body: notification.body,
                data: notification.data,
                isDelivered: false,
                fcmResponse: {
                    error: error.message
                }
            });
            await notificationDoc.save();
        } catch (dbError) {
            console.error('Error saving notification to database:', dbError);
        }

        return null;
    }
};

/**
 * Send notification for post interactions (like, comment, share)
 */
const sendPostNotification = async (postId, senderId, recipientId, type, additionalData = {}) => {
    try {
        // Don't send notification to yourself
        if (senderId === recipientId) return null;

        const [sender, post] = await Promise.all([
            User.findById(senderId).select('firstName lastName username profilePicture'),
            require('../models/Post').findById(postId).select('content author')
        ]);

        if (!sender || !post || post.author.toString() !== recipientId) return null;

        let title, body;
        const senderName = `${sender.firstName} ${sender.lastName}`;
        const postPreview = post.content.length > 50 ?
            post.content.substring(0, 50) + '...' : post.content;

        switch (type) {
            case 'like':
                title = 'New Like';
                body = `${senderName} liked your post: "${postPreview}"`;
                break;
            case 'comment':
                title = 'New Comment';
                body = `${senderName} commented on your post: "${postPreview}"`;
                break;
            case 'share':
                title = 'Post Shared';
                body = `${senderName} shared your post: "${postPreview}"`;
                break;
            default:
                return null;
        }

        return await sendPushNotification(recipientId, {
            title,
            body,
            type,
            senderId,
            data: {
                postId: postId.toString(),
                senderId: senderId.toString(),
                senderName,
                senderProfilePicture: sender.profilePicture || '',
                ...additionalData
            }
        });

    } catch (error) {
        console.error('Error sending post notification:', error);
        return null;
    }
};

/**
 * Send notification for new messages
 */
const sendMessageNotification = async (chatRoomId, senderId, messageContent, messageType = 'text') => {
    try {
        const [sender, chatRoom] = await Promise.all([
            User.findById(senderId).select('firstName lastName username profilePicture isOnline'),
            require('../models/ChatRoom').findById(chatRoomId).populate('participants', 'isOnline notificationSettings fcmTokens')
        ]);

        if (!sender || !chatRoom) return;

        const senderName = `${sender.firstName} ${sender.lastName}`;

        // Get recipients (exclude sender)
        const recipients = chatRoom.participants.filter(p =>
            p._id.toString() !== senderId &&
            !p.isOnline && // Only send to offline users for 1-on-1 chats
            p.notificationSettings.messages
        );

        // For group chats, send to all participants except sender (regardless of online status)
        const finalRecipients = chatRoom.isGroup ?
            chatRoom.participants.filter(p =>
                p._id.toString() !== senderId &&
                p.notificationSettings.messages
            ) : recipients;

        if (finalRecipients.length === 0) return;

        const title = chatRoom.isGroup ? chatRoom.name || 'Group Chat' : senderName;
        let body;

        switch (messageType) {
            case 'image':
                body = chatRoom.isGroup ? `${senderName} sent a photo` : 'Sent a photo';
                break;
            case 'video':
                body = chatRoom.isGroup ? `${senderName} sent a video` : 'Sent a video';
                break;
            case 'file':
                body = chatRoom.isGroup ? `${senderName} sent a file` : 'Sent a file';
                break;
            default:
                body = chatRoom.isGroup ?
                    `${senderName}: ${messageContent}` :
                    messageContent;
        }

        // Send notifications to all recipients
        const notificationPromises = finalRecipients.map(recipient =>
            sendPushNotification(recipient._id.toString(), {
                title,
                body,
                type: 'message',
                senderId,
                data: {
                    chatRoomId: chatRoomId.toString(),
                    senderId: senderId.toString(),
                    senderName,
                    senderProfilePicture: sender.profilePicture || '',
                    isGroup: chatRoom.isGroup.toString(),
                    messageType
                }
            })
        );

        await Promise.all(notificationPromises);

    } catch (error) {
        console.error('Error sending message notification:', error);
    }
};

/**
 * Send notification for new chat creation
 */
const sendChatCreatedNotification = async (chatRoomId, creatorId) => {
    try {
        const [creator, chatRoom] = await Promise.all([
            User.findById(creatorId).select('firstName lastName username profilePicture'),
            require('../models/ChatRoom').findById(chatRoomId).populate('participants', 'notificationSettings')
        ]);

        if (!creator || !chatRoom) return;

        const creatorName = `${creator.firstName} ${creator.lastName}`;

        // Get recipients (exclude creator)
        const recipients = chatRoom.participants.filter(p =>
            p._id.toString() !== creatorId &&
            (chatRoom.isGroup ? p.notificationSettings.groupChats : p.notificationSettings.messages)
        );

        if (recipients.length === 0) return;

        const title = chatRoom.isGroup ? 'Added to Group' : 'New Chat';
        const body = chatRoom.isGroup ?
            `${creatorName} added you to "${chatRoom.name || 'Unnamed Group'}"` :
            `${creatorName} started a conversation with you`;

        // Send notifications to all recipients
        const notificationPromises = recipients.map(recipient =>
            sendPushNotification(recipient._id.toString(), {
                title,
                body,
                type: chatRoom.isGroup ? 'group_created' : 'chat_created',
                senderId: creatorId,
                data: {
                    chatRoomId: chatRoomId.toString(),
                    senderId: creatorId.toString(),
                    senderName: creatorName,
                    senderProfilePicture: creator.profilePicture || '',
                    isGroup: chatRoom.isGroup.toString(),
                    chatName: chatRoom.name || ''
                }
            })
        );

        await Promise.all(notificationPromises);

    } catch (error) {
        console.error('Error sending chat created notification:', error);
    }
};

/**
 * Send notification for follow events
 */
const sendFollowNotification = async (followerId, followedId) => {
    try {
        if (followerId === followedId) return null;

        const follower = await User.findById(followerId).select('firstName lastName username profilePicture');
        if (!follower) return null;

        const followerName = `${follower.firstName} ${follower.lastName}`;

        return await sendPushNotification(followedId, {
            title: 'New Follower',
            body: `${followerName} started following you`,
            type: 'follow',
            senderId: followerId,
            data: {
                senderId: followerId.toString(),
                senderName: followerName,
                senderProfilePicture: follower.profilePicture || ''
            }
        });

    } catch (error) {
        console.error('Error sending follow notification:', error);
        return null;
    }
};

/**
 * Get notification settings key based on type
 */
const getNotificationKey = (type) => {
    const keyMap = {
        'like': 'likes',
        'comment': 'comments',
        'share': 'shares',
        'follow': 'follows',
        'message': 'messages',
        'chat_created': 'messages',
        'group_created': 'groupChats',
        'group_added': 'groupChats'
    };
    return keyMap[type];
};

/**
 * Get unread notification count for badge
 */
const getUnreadNotificationCount = async (userId) => {
    try {
        return await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
};

/**
 * Remove invalid/expired FCM tokens
 */
const removeInvalidTokens = async (userId, invalidTokens) => {
    try {
        await User.updateOne(
            { _id: userId },
            { $pull: { fcmTokens: { token: { $in: invalidTokens } } } }
        );
    } catch (error) {
        console.error('Error removing invalid tokens:', error);
    }
};

/**
 * Add FCM token for a user
 */
const addFCMToken = async (userId, token, device = 'web') => {
    try {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        // Check if token already exists
        const existingToken = user.fcmTokens.find(t => t.token === token);
        if (existingToken) {
            // Update device type and timestamp
            existingToken.device = device;
            existingToken.addedAt = new Date();
        } else {
            // Add new token
            user.fcmTokens.push({ token, device });
        }

        // Keep only the last 5 tokens per user (to handle multiple devices)
        if (user.fcmTokens.length > 5) {
            user.fcmTokens = user.fcmTokens.slice(-5);
        }

        await user.save();
        return { success: true };
    } catch (error) {
        console.error('Error adding FCM token:', error);
        throw error;
    }
};

/**
 * Remove FCM token for a user
 */
const removeFCMToken = async (userId, token) => {
    try {
        await User.updateOne(
            { _id: userId },
            { $pull: { fcmTokens: { token } } }
        );
        return { success: true };
    } catch (error) {
        console.error('Error removing FCM token:', error);
        throw error;
    }
};

/**
 * Update user's online status with proper timeout handling
 */
const updateOnlineStatus = async (userId, isOnline) => {
    try {
        const updateData = {
            isOnline,
            lastSeen: new Date()
        };

        await User.updateOne({ _id: userId }, updateData);
    } catch (error) {
        console.error('Error updating online status:', error);
        // Don't throw - this shouldn't break socket connection
    }
};

module.exports = {
    sendPushNotification,
    sendPostNotification,
    sendMessageNotification,
    sendChatCreatedNotification,
    sendFollowNotification,
    addFCMToken,
    removeFCMToken,
    updateOnlineStatus,
    getUnreadNotificationCount
};
