const admin = require('../config/firebase');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { checkNotificationRateLimit } = require('../utils/notificationRateLimit');

const sendPushNotification = async (userId, notification) => {
    try {
        // Check rate limiting
        if (!checkNotificationRateLimit(userId, 10, 60000)) {
            console.warn(`Rate limit exceeded for user ${userId}, skipping notification`);
            return {
                success: false,
                delivered: 0,
                failed: 1,
                rateLimited: true
            };
        }

        // Get user's FCM tokens and notification settings
        const user = await User.findById(userId).select('fcmTokens');
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.fcmTokens || user.fcmTokens.length === 0) {
            throw new Error('FCM tokens not found');
        }

        // Get user's notification settings
        const settings = await Settings.findOne({ user: userId }).select('notifications');
        if (!settings) {
            throw new Error('User settings not found');
        }


        // Check if user has enabled this type of notification
        const notificationType = notification.type;
        const notificationKey = getNotificationKey(notificationType);

        if (notificationKey && !settings.notifications[notificationKey]) {
            return null;
        }

        // Prepare FCM message
        const tokens = user.fcmTokens.map(tokenObj => tokenObj.token);
        // Convert all data values to strings (FCM requirement)
        const stringifiedData = {};
        if (notification.data) {
            Object.keys(notification.data).forEach(key => {
                const value = notification.data[key];
                stringifiedData[key] = value !== null && value !== undefined ? String(value) : '';
            });
        }

        const fcmMessage = {
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: {
                type: notification.type,
                ...stringifiedData
            },
            tokens: tokens
        };

        fcmMessage.webpush = {
            notification: {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                requireInteraction: false
            }
        };

        // Send notification via FCM
        let response;
        try {
            response = await admin.messaging().sendEachForMulticast(fcmMessage);
            if (response.failureCount > 0) {
                console.warn(`FCM partial failure: ${response.failureCount}/${response.responses.length} tokens failed`);
                // Don't throw error for partial failures, log and continue
                response.responses.forEach((resp, index) => {
                    if (!resp.success && resp.error) {
                        console.error(`Token ${index} failed:`, resp.error);
                    }
                });
            }
        } catch (error) {
            console.error('FCM send error:', error);
            response = {
                successCount: 0,
                failureCount: tokens.length,
                responses: tokens.map(() => ({ success: false, error: error.message }))
            };
        }

        console.log('send push notification:', fcmMessage, '  with reponse:', response.responses);


        // Save notification to database
        const notificationDoc = new Notification({
            recipient: userId,
            sender: notification.senderId,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            data: {
                postId: notification.data?.postId,
                chatRoomId: notification.data?.chatRoomId,
                messageId: notification.data?.messageId,
                commentId: notification.data?.commentId
            },
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
                recipient: notification.recipient || userId,
                sender: notificationData.senderId || notification.sender?._id || notification.sender,
                type: notification.type,
                title: notification.title,
                body: notification.body,
                data: {
                    postId: notification.data?.postId,
                    chatRoomId: notification.data?.chatRoomId,
                    messageId: notification.data?.messageId,
                    commentId: notification.data?.commentId
                },
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

const createNotification = async (notificationData, sendPush = true) => {
    try {
        if (!sendPush) {
            const notificationDoc = new Notification({
                recipient: notificationData.recipient,
                sender: notificationData.senderId || notification.sender?._id || notification.sender,
                type: notificationData.type,
                title: notificationData.title,
                body: notificationData.body,
                data: {
                    postId: notification.data?.postId,
                    chatRoomId: notification.data?.chatRoomId,
                    messageId: notification.data?.messageId,
                    commentId: notification.data?.commentId
                } || {},
                isDelivered: false
            });
            await notificationDoc.save();
            return notificationDoc;
        }

        return await sendPushNotification(notificationData.recipient, {
            senderId: notificationData.sender,
            type: notificationData.type,
            title: notificationData.title,
            body: notificationData.body,
            data: notificationData.data || {}
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

const sendPostNotification = async (postId, senderId, recipientId, type, additionalData = {}) => {
    try {
        // Don't send notification to yourself
        if (senderId === recipientId) return null;

        const [sender, post] = await Promise.all([
            User.findById(senderId).select('firstName lastName username profilePicture'),
            require('../models/Post').findById(postId).select('content author')
        ]);

        if (!sender || !post) return null;

        // For replies, allow notifications to comment authors or post authors
        // For regular comments, only notify post authors
        const isReply = additionalData.isReply;
        const isPostAuthor = post.author.toString() === recipientId;

        if (!isReply && !isPostAuthor) {
            return null; // Regular comments can only go to post author
        }

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
                if (isReply) {
                    title = 'New Reply to your comment at a post';
                    body = isPostAuthor
                        ? `${senderName} replied to a comment on your post: "${postPreview}"`
                        : `${senderName} replied to your comment: "${postPreview}"`;
                } else {
                    title = 'New Comment';
                    body = `${senderName} commented on your post: "${postPreview}"`;
                }
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
            receipient: recipientId,
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

const sendMessageNotification = async (chatRoomId, senderId, messageContent, messageType = 'text', messageId) => {
    try {
        const [sender, chatRoom] = await Promise.all([
            User.findById(senderId).select('firstName lastName username profilePicture isOnline'),
            require('../models/ChatRoom').findById(chatRoomId).populate('participants', 'isOnline fcmTokens')
        ]);

        if (!sender || !chatRoom) return;

        const senderName = `${sender.firstName} ${sender.lastName}`;

        // Get recipients (exclude sender)
        const offlineRecipients = chatRoom.participants.filter(p =>
            p._id.toString() !== senderId &&
            !p.isOnline // Only send to offline users for 1-on-1 chats
        );

        // Check notification settings for each recipient
        const validRecipients = [];
        for (const recipient of offlineRecipients) {
            const settings = await Settings.findOne({ user: recipient._id }).select('notifications');
            if (settings && settings.notifications.messages) {
                validRecipients.push(recipient);
            }
        }

        // For group chats, send to all participants except sender (regardless of online status)
        let finalRecipients;
        if (chatRoom.isGroup) {
            const groupRecipients = chatRoom.participants.filter(p => p._id.toString() !== senderId);
            finalRecipients = [];
            for (const recipient of groupRecipients) {
                const settings = await Settings.findOne({ user: recipient._id }).select('notifications');
                if (settings && settings.notifications.groupChats) {
                    finalRecipients.push(recipient);
                }
            }
        } else {
            finalRecipients = validRecipients;
        }

        if (finalRecipients.length === 0) return;

        const title = chatRoom.isGroup ? chatRoom.name || 'Group Chat' : `Message by ${senderName}`;
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
                    `message: ${messageContent}`;
        }

        // Send notifications to all recipients
        const notificationPromises = finalRecipients.map(recipient =>
            sendPushNotification((recipient?._id.toString() || recipient.toString()), {
                title,
                body,
                type: 'message',
                senderId,
                sender: senderId,
                receipient: recipient?._id.toString() || recipient.toString(),
                data: {
                    chatRoomId: chatRoomId.toString(),
                    messageId: messageId ? messageId.toString() : undefined,
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

const sendChatCreatedNotification = async (chatRoomId, creatorId) => {
    try {
        const [creator, chatRoom] = await Promise.all([
            User.findById(creatorId).select('firstName lastName username profilePicture'),
            require('../models/ChatRoom').findById(chatRoomId).populate('participants')
        ]);

        if (!creator || !chatRoom) return;

        const creatorName = `${creator.firstName} ${creator.lastName}`;

        // Get recipients (exclude creator) and check their notification settings
        const potentialRecipients = chatRoom.participants.filter(p => p._id.toString() !== creatorId);
        const recipients = [];

        for (const recipient of potentialRecipients) {
            const settings = await Settings.findOne({ user: recipient._id }).select('notifications');
            if (settings) {
                const notificationEnabled = chatRoom.isGroup ?
                    settings.notifications.groupChats :
                    settings.notifications.messages;
                if (notificationEnabled) {
                    recipients.push(recipient);
                }
            }
        }

        if (recipients.length === 0) return;

        const title = chatRoom.isGroup ? 'Added to Group' : 'New Chat';
        const body = chatRoom.isGroup ?
            `${creatorName} added you to "${chatRoom.name || 'Unnamed Group'}"` :
            `${creatorName} started a conversation with you`;

        // Send notifications to all recipients
        const notificationPromises = recipients.map(recipient =>
            sendPushNotification((recipient?._id.toString() || recipient.toString()), {
                title,
                body,
                type: chatRoom.isGroup ? 'group_created' : 'chat_created',
                senderId: creatorId,
                sender: creatorId,
                receipient: recipient?._id.toString() || recipient.toString(),
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

const sendGroupAddedNotification = async (chatRoomId, adderId, addedUserId) => {
    try {
        // Don't send notification to yourself
        if (adderId === addedUserId) return null;

        const [adder, chatRoom] = await Promise.all([
            User.findById(adderId).select('firstName lastName username profilePicture'),
            require('../models/ChatRoom').findById(chatRoomId).select('name isGroup')
        ]);

        if (!adder || !chatRoom || !chatRoom.isGroup) return null;

        // Check notification settings
        const settings = await Settings.findOne({ user: addedUserId }).select('notifications');
        if (!settings || !settings.notifications.groupChats) return null;

        const adderName = `${adder.firstName} ${adder.lastName}`;
        const title = 'Added to Group';
        const body = `${adderName} added you to "${chatRoom.name || 'Unnamed Group'}"`;

        return await sendPushNotification(addedUserId, {
            title,
            body,
            type: 'group_added',
            senderId: adderId,
            sender: adderId,
            receipient: addedUserId,
            data: {
                chatRoomId: chatRoomId.toString(),
                senderId: adderId.toString(),
                senderName: adderName,
                senderProfilePicture: adder.profilePicture || '',
                isGroup: 'true',
                chatName: chatRoom.name || ''
            }
        });

    } catch (error) {
        console.error('Error sending group added notification:', error);
        return null;
    }
};

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
            sender: followerId,
            receipient: followedId,
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

const getNotificationKey = (type) => {
    const keyMap = {
        'like': 'likes',
        'comment': 'comments',
        'share': 'shares',
        'follow': 'follows',
        'message': 'messages',
        'chat_created': 'messages',
        'group_created': 'groupChats',
        'group_added': 'groupChats',
        'chat_permission_request': 'messages'
    };
    return keyMap[type];
};

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

const checkFCMToken = async (userId, token) => {
    try {
        const user = await User.findOne({ _id: userId, 'fcmTokens.token': token });
        return !!user;
    } catch (error) {
        console.error('Error checking FCM token:', error);
        return false;
    }
}

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
    createNotification,
    sendPostNotification,
    sendMessageNotification,
    sendChatCreatedNotification,
    sendGroupAddedNotification,
    sendFollowNotification,
    addFCMToken,
    removeFCMToken,
    updateOnlineStatus,
    getUnreadNotificationCount,
    checkFCMToken
};
