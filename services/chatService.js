const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const User = require('../models/User');
const { ERROR_MESSAGES } = require('../constants/messages');
const settingsService = require('./settingsService');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv').config();
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create a new chat room
const createChatRoom = async (participants, isGroup = false, name = '', creatorId = null, roomId = null) => {
    try {
        // If roomId is provided, we're adding participants to existing group chat
        if (roomId) {
            const existingRoom = await ChatRoom.findById(roomId);
            if (!existingRoom) {
                throw new Error('Chat room not found');
            }

            if (!existingRoom.isGroup) {
                throw new Error('Cannot add participants to one-on-one chat');
            }

            // Check if creator is a participant in the existing room
            if (!existingRoom.participants.includes(creatorId)) {
                throw new Error('Not authorized to add participants to this group');
            }

            // Add new participants to the existing room
            const newParticipants = participants.filter(p => !existingRoom.participants.includes(p));
            existingRoom.participants.push(...newParticipants);

            // Remove any participants from deletedFor array if they're being re-added
            if (existingRoom.deletedFor) {
                existingRoom.deletedFor = existingRoom.deletedFor.filter(
                    deletedId => !participants.includes(deletedId.toString())
                );
            }

            await existingRoom.save();

            const updatedRoom = await ChatRoom.findById(roomId)
                .populate('participants', 'username firstName lastName profilePicture')
                .populate('lastMessage');

            // Send notifications for new participants
            const notificationService = require('./notificationService');
            newParticipants.forEach(participantId => {
                notificationService.sendGroupAddedNotification(roomId, creatorId, participantId)
                    .catch(err => console.error('Chat participant notification error:', err));
            });

            return updatedRoom;
        }

        // For one-on-one chats, check privacy settings
        if (!isGroup && participants.length === 2) {
            const otherUserId = participants.find(id => id !== creatorId);
            if (otherUserId && creatorId) {
                const canMessage = await settingsService.canUserMessage(creatorId, otherUserId);
                if (!canMessage.canMessage) {
                    throw new Error(canMessage.reason);
                }
            }

            // Check if it's a one-on-one chat that already exists (including soft deleted)
            const existingChat = await ChatRoom.findOne({
                isGroup: false,
                participants: { $all: participants, $size: 2 }
            }).populate('participants', 'username firstName lastName profilePicture');

            if (existingChat) {
                // If chat exists and user has soft deleted it, remove from deletedFor
                if (existingChat.deletedFor && existingChat.deletedFor.includes(creatorId)) {
                    existingChat.deletedFor = existingChat.deletedFor.filter(id => id.toString() !== creatorId.toString());
                    await existingChat.save();
                }
                return existingChat;
            }
        }

        // For group chats, check if similar group already exists
        if (isGroup) {
            // For group chats, check if a group with same participants already exists
            const existingGroupChat = await ChatRoom.findOne({
                isGroup: true,
                participants: { $all: participants, $size: participants.length }
            }).populate('participants', 'username firstName lastName profilePicture');

            if (existingGroupChat) {
                // If group chat exists and user has soft deleted it, remove from deletedFor
                if (existingGroupChat.deletedFor && existingGroupChat.deletedFor.includes(creatorId)) {
                    existingGroupChat.deletedFor = existingGroupChat.deletedFor.filter(
                        deletedId => deletedId.toString() !== creatorId.toString()
                    );
                    await existingGroupChat.save();
                }
                return existingGroupChat;
            }
        }

        // Create new chat room
        const chatRoom = new ChatRoom({
            isGroup,
            name: isGroup ? name : '',
            participants
        });

        await chatRoom.save();
        const newChatRoom = await ChatRoom.findById(chatRoom._id)
            .populate('participants', 'username firstName lastName profilePicture')
            .populate('lastMessage');

        // Send notifications for chat creation
        const notificationService = require('./notificationService');
        if (isGroup) {
            // For group chats, notify all participants except creator
            participants.forEach(participantId => {
                if (participantId !== creatorId) {
                    notificationService.sendChatCreatedNotification(chatRoom._id, creatorId, participantId)
                        .catch(err => console.error('Group chat creation notification error:', err));
                }
            });
        } else {
            // For one-on-one chats, notify the other participant
            const otherParticipant = participants.find(id => id !== creatorId);
            if (otherParticipant) {
                notificationService.sendChatCreatedNotification(chatRoom._id, creatorId, otherParticipant)
                    .catch(err => console.error('Chat creation notification error:', err));
            }
        }

        return newChatRoom;
    } catch (error) {
        console.error('Error creating chat room:', error);
        throw error;
    }
};

// Get all user chats
const getUserChats = async (userId) => {
    try {
        const chats = await ChatRoom.find({
            participants: userId,
            deletedFor: { $ne: userId }
        })
            .populate({
                path: 'participants',
                select: 'username firstName lastName profilePicture isOnline deleted',
                match: { deleted: { $ne: true } } // Only populate non-deleted users
            })
            .populate({
                path: 'lastMessage',
                populate: {
                    path: 'sender',
                    select: 'username firstName lastName profilePicture deleted',
                    match: { deleted: { $ne: true } } // Only populate non-deleted senders
                }
            })
            .sort({ updatedAt: -1 });

        // Filter out chats where all participants are deleted
        const validChats = chats.filter(chat =>
            chat.participants && chat.participants.length > 0
        );

        return validChats;
    } catch (error) {
        console.error('Error fetching user chats:', error);
        throw error;
    }
};

// Get chat messages with pagination
const getChatMessages = async (roomId, page = 1, limit = 50, userId) => {
    try {
        const skip = (page - 1) * limit;

        const messages = await Message.find(
            {
                chatRoom: roomId,
                deletedFor: { $ne: userId }
            }
        )
            .populate({
                path: 'sender',
                select: 'username firstName lastName profilePicture deleted',
                match: { deleted: { $ne: true } } // Only populate non-deleted senders
            })
            .populate({
                path: 'seenBy',
                select: 'username firstName lastName profilePicture deleted',
                match: { deleted: { $ne: true } } // Only populate non-deleted users
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Filter out messages from deleted senders (but keep the message with anonymous sender info)
        const validMessages = messages.map(message => {
            if (!message.sender) {
                // If sender is deleted, replace with anonymous info
                return {
                    ...message.toObject(),
                    sender: {
                        username: 'deleted_user',
                        firstName: 'Deleted',
                        lastName: 'User',
                        profilePicture: ''
                    }
                };
            }
            return message;
        });

        const totalMessages = await Message.countDocuments({
            chatRoom: roomId,
            deletedFor: { $ne: userId }
        });
        const totalPages = Math.ceil(totalMessages / limit);

        return {
            messages: validMessages.reverse(), // Reverse to show oldest first
            pagination: {
                currentPage: page,
                totalPages,
                totalMessages,
                hasMore: page < totalPages
            }
        };
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        throw error;
    }
};

// Delete a chat room (soft delete implementation)
const deleteChatRoom = async (roomId, userId) => {
    try {
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
            throw new Error('Chat room not found');
        }

        // Check if user is a participant
        if (!chatRoom.participants.includes(userId)) {
            throw new Error('Not authorized to delete this chat');
        }

        // Check if user already deleted this chat
        if (chatRoom.deletedFor && chatRoom.deletedFor.includes(userId)) {
            return { success: true, message: 'Chat already deleted for this user' };
        }

        // Add user to deletedFor array
        if (!chatRoom.deletedFor) {
            chatRoom.deletedFor = [];
        }
        chatRoom.deletedFor.push(userId);

        // Check if all participants have deleted the chat
        const allParticipantsDeleted = chatRoom.participants.every(participantId =>
            chatRoom.deletedFor.some(deletedId => deletedId.toString() === participantId.toString())
        );

        if (allParticipantsDeleted) {
            // Complete deletion: delete all media and messages, then delete chat room
            console.log(`All participants deleted chat ${roomId}, performing complete deletion`);

            // Get all messages with media before deleting them
            const messagesWithMedia = await Message.find({
                chatRoom: roomId,
                messageType: { $ne: 'text' },
                content: { $exists: true, $ne: '' }
            });

            // Delete media from Cloudinary for all messages with media
            const mediaDeletePromises = messagesWithMedia.map(async (message) => {
                try {
                    await deleteMediaFromCloudinaryByUrl(message.content);
                } catch (mediaError) {
                    console.error(`Error deleting media for message ${message._id}:`, mediaError);
                    // Continue with deletion even if some media fails to delete
                }
            });

            // Wait for all media deletion attempts to complete
            await Promise.allSettled(mediaDeletePromises);

            // Delete all messages in the chat room
            await Message.deleteMany({ chatRoom: roomId });

            // Delete the chat room completely
            await ChatRoom.findByIdAndDelete(roomId);

            return { success: true, message: 'Chat deleted completely' };
        } else {
            // Soft delete: just save the updated deletedFor array
            await chatRoom.save();
            return { success: true, message: 'Chat deleted for user' };
        }
    } catch (error) {
        console.error('Error deleting chat room:', error);
        throw error;
    }
};

// Delete a message (soft delete implementation)
const deleteMessage = async (messageId, userId) => {
    try {
        const message = await Message.findById(messageId).populate('chatRoom');
        if (!message) {
            throw new Error('Message not found');
        }

        const chatRoom = message.chatRoom;
        if (!chatRoom) {
            throw new Error('Chat room not found');
        }

        // Check if user is a participant in the chat
        if (!chatRoom.participants.includes(userId)) {
            throw new Error('Not authorized to delete this message');
        }

        // Check if user already deleted this message
        if (message.deletedFor && message.deletedFor.includes(userId)) {
            const isSender = message.sender.toString() === userId;
            if (isSender && message.content !== 'owner deleted their account.') {
                const owner = await User.findById(message.sender).select('deleted');
                if (owner && owner.deleted) {
                    message.content = 'owner deleted their account.';
                    message.messageType = 'text';
                    message.caption = ''; // Clear caption if any
                }
            }
            throw new Error('Message already been deleted for this user');
        }

        const isSender = message.sender.toString() === userId;
        let socketData = {
            roomId: chatRoom._id.toString(),
            messageUpdate: null,
            isCompletelyDeleted: false
        };

        if (isSender) {
            // If sender is deleting: change content and delete media
            console.log(`Sender deleting message ${messageId}`);

            // If message has media, delete from cloudinary
            if (message.messageType !== 'text' && message.content && message.content.trim() !== '') {
                try {
                    console.log(`Deleting media for message ${messageId}: ${message.content}`);
                    await deleteMediaFromCloudinaryByUrl(message.content);
                    console.log(`Successfully deleted media for message ${messageId}`);
                } catch (mediaError) {
                    console.error(`Error deleting media from cloudinary for message ${messageId}:`, mediaError);
                    // Continue with message deletion even if media deletion fails
                }
            }

            // Change message content and type
            message.content = 'deleted by owner';
            message.messageType = 'text';
            message.caption = ''; // Clear caption if any

            // Store updated message data for socket emission
            socketData.messageUpdate = {
                _id: message._id,
                content: 'deleted by owner',
                messageType: 'text',
                caption: '',
                sender: message.sender,
                chatRoom: message.chatRoom._id,
                createdAt: message.createdAt,
                updatedAt: new Date(),
                seenBy: message.seenBy
            };
        }

        // Add user to deletedFor array
        if (!message.deletedFor) {
            message.deletedFor = [];
        }
        message.deletedFor.push(userId);

        // Check if all participants have deleted the message
        const allParticipantsDeleted = chatRoom.participants.every(participantId =>
            message.deletedFor.some(deletedId => deletedId.toString() === participantId.toString())
        );

        if (allParticipantsDeleted) {
            // Complete deletion: delete the message completely
            console.log(`All participants deleted message ${messageId}, performing complete deletion`);

            // If message still has media (shouldn't happen but safety check)
            if (message.messageType !== 'text' && message.content && message.content.trim() !== '' && message.content !== 'deleted by owner') {
                try {
                    await deleteMediaFromCloudinaryByUrl(message.content);
                } catch (mediaError) {
                    console.error(`Error deleting remaining media for message ${messageId}:`, mediaError);
                }
            }

            await Message.findByIdAndDelete(messageId);

            // Mark as completely deleted for socket emission
            socketData.isCompletelyDeleted = true;

            // Update last message in chat room if this was the last message
            if (chatRoom.lastMessage && chatRoom.lastMessage.toString() === messageId) {
                const lastMessage = await Message.findOne({ chatRoom: chatRoom._id })
                    .sort({ createdAt: -1 });

                chatRoom.lastMessage = lastMessage ? lastMessage._id : null;
                await chatRoom.save();
            }

            return { success: true, message: 'Message deleted completely', socketData };
        } else {
            // Soft delete: save the updated message
            await message.save();

            // Update last message in chat room if this was the last message
            if (chatRoom.lastMessage && chatRoom.lastMessage.toString() === messageId) {
                // If this was the last message and sender deleted it, update chat room's lastMessage
                if (isSender) {
                    const lastMessage = await Message.findOne({ chatRoom: chatRoom._id })
                        .sort({ createdAt: -1 });

                    chatRoom.lastMessage = lastMessage ? lastMessage._id : null;
                    await chatRoom.save();
                }
            }

            return { success: true, message: isSender ? 'Message deleted by sender' : 'Message deleted for user', socketData };
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
};

// Delete all messages sent by a user (for account deletion)
const deleteUserMessages = async (userId) => {
    try {
        console.log(`Deleting all messages for user: ${userId}`);

        // Find all messages sent by this user
        const userMessages = await Message.find({ sender: userId }).populate('chatRoom');

        for (const message of userMessages) {
            try {
                // Skip if chat room no longer exists or user is no longer a participant
                if (!message.chatRoom || !message.chatRoom.participants.includes(userId)) {
                    console.log(`Skipping message ${message._id} - chat room no longer accessible`);
                    continue;
                }

                // For account deletion, we can directly modify the message without socket emission
                console.log(`Processing message ${message._id} for user account deletion`);

                // If message has media, delete from cloudinary
                if (message.messageType !== 'text' && message.content && message.content.trim() !== '') {
                    try {
                        await deleteMediaFromCloudinaryByUrl(message.content);
                    } catch (mediaError) {
                        console.error(`Error deleting media for message ${message._id}:`, mediaError);
                    }
                }

                // Change message content to indicate owner deleted their account
                message.content = 'owner deleted their account.';
                message.messageType = 'text';
                message.caption = '';

                // Add user to deletedFor array
                if (!message.deletedFor) {
                    message.deletedFor = [];
                }
                if (!message.deletedFor.includes(userId)) {
                    message.deletedFor.push(userId);
                }

                await message.save();

                // Update last message in chat room if this was the last message
                const chatRoom = message.chatRoom;
                if (chatRoom.lastMessage && chatRoom.lastMessage.toString() === message._id.toString()) {
                    const lastMessage = await Message.findOne({ chatRoom: chatRoom._id })
                        .sort({ createdAt: -1 });

                    chatRoom.lastMessage = lastMessage ? lastMessage._id : null;
                    await chatRoom.save();
                }

            } catch (messageError) {
                console.error(`Error processing message ${message._id}:`, messageError);
                // Continue with other messages even if one fails
            }
        }

        console.log(`Completed processing messages for user: ${userId}`);
        return { success: true, message: 'User messages processed for account deletion' };

    } catch (error) {
        console.error('Error deleting user messages:', error);
        throw error;
    }
};

// Upload media for chat
const uploadMedia = async (roomId, mediaFiles) => {
    try {
        const chatRoom = await ChatRoom.findById(roomId);
        if (!chatRoom) {
            throw new Error('Chat room not found');
        }

        const mediaUrls = [];

        for (const file of mediaFiles) {
            const isVideo = file.mimetype.startsWith('video/');
            const resourceType = isVideo ? 'video' : 'image';

            // Optimized upload configuration for chat media
            const uploadConfig = {
                resource_type: resourceType,
                quality: 'auto',
                flags: 'any_format',
                eager: isVideo ? [
                    { format: 'mp4', quality: 'auto:best', video_codec: 'h264' },
                    { format: 'webm', quality: 'auto:best', video_codec: 'vp9' },
                    { format: 'jpg', quality: 'auto:best', resource_type: 'image' } // video thumbnail
                ] : [
                    { quality: 'auto:best', flags: 'any_format' },
                    { format: 'webp', quality: 'auto:best' },
                    { width: 400, height: 400, crop: 'limit', quality: 'auto:best' },
                    { width: 800, height: 800, crop: 'limit', quality: 'auto:best' }
                ],
                fetch_format: 'auto',
                progressive: true,
                strip_transformations: true,
                cache_control: 'max-age=31536000',
                backup: true,
                folder: `chats/${roomId}`,
                public_id: `${roomId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                overwrite: true,
                type: 'upload',
                tags: ['chat_media', roomId, resourceType],
                context: {
                    alt: `Media for chat ${roomId}`,
                    caption: `Uploaded at ${new Date().toISOString()}`
                }
            };

            if (isVideo) {
                uploadConfig.video_codec = 'h264';
                uploadConfig.audio_codec = 'aac';
                uploadConfig.eager_async = true;
            }

            const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    uploadConfig,
                    function (error, result) {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );
                fs.createReadStream(file.path).pipe(stream);
            });

            const mediaInfo = {
                secure_url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type,
                format: result.format,
                width: result.width,
                height: result.height,
                bytes: result.bytes,
                eager: result.eager?.map(eager => ({
                    secure_url: eager.secure_url,
                    width: eager.width,
                    height: eager.height,
                    format: eager.format,
                    bytes: eager.bytes
                })) || [],
                responsive_urls: isVideo ? {
                    mp4: result.eager?.find(e => e.format === 'mp4')?.secure_url,
                    webm: result.eager?.find(e => e.format === 'webm')?.secure_url,
                    poster: result.eager?.find(e => e.resource_type === 'image')?.secure_url
                } : {
                    original: result.secure_url,
                    small: result.eager?.find(e => e.width === 400)?.secure_url,
                    medium: result.eager?.find(e => e.width === 800)?.secure_url,
                    webp: result.eager?.find(e => e.format === 'webp')?.secure_url
                },
                uploaded_at: new Date().toISOString()
            };

            mediaUrls.push(mediaInfo);

            // Clean up local file
            fs.unlink(file.path, (err) => {
                if (err) console.error('Error deleting local file:', err);
            });
        }

        return mediaUrls;
    } catch (error) {
        console.error('Error uploading media:', error);
        throw error;
    }
};


// Delete media from Cloudinary by public_id
const deleteMediaFromCloudinary = async (publicId, resourceType = 'image') => {
    try {
        console.log(`Deleting from Cloudinary - Public ID: ${publicId}, Resource Type: ${resourceType}`);

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true // Invalidate CDN cache
        });

        console.log(`Cloudinary deletion result for ${publicId}:`, result);

        // Cloudinary returns { result: 'ok' } for successful deletions
        // or { result: 'not found' } if the resource doesn't exist
        return result;
    } catch (error) {
        console.error(`Error deleting ${publicId} from Cloudinary:`, error);
        throw error;
    }
};

//helper functions for upcoming service____________
const extractPublicIdFromUrl = (url) => {
    try {
        // Handle different Cloudinary URL formats
        // Format 1: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
        // Format 2: https://res.cloudinary.com/cloud_name/image/upload/folder/filename.jpg
        // Format 3: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/filename.jpg
        // Format 4: https://res.cloudinary.com/cloud_name/image/upload/filename.jpg

        // First, remove the base URL and get the path after '/upload/'
        const uploadMatch = url.match(/\/upload\/(.+)$/);
        if (!uploadMatch) {
            throw new Error('Invalid Cloudinary URL format');
        }

        let pathAfterUpload = uploadMatch[1];

        // Remove version number if present (starts with 'v' followed by digits)
        pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

        // Remove file extension
        const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');

        console.log(`Extracted public_id: ${publicId} from URL: ${url}`);
        return publicId;
    } catch (error) {
        console.error('Error extracting public_id from URL:', error);
        return null;
    }
};

// Function to detect resource type from URL
const detectResourceTypeFromUrl = (url) => {
    if (url.includes('/video/upload/')) {
        return 'video';
    } else if (url.includes('/image/upload/')) {
        return 'image';
    } else if (url.includes('/raw/upload/')) {
        return 'raw';
    }
    // Default to image if can't detect
    return 'image';
};

//________________________________
const deleteMediaFromCloudinaryByUrl = async (url, resourceType = null) => {
    try {
        const publicId = extractPublicIdFromUrl(url);

        if (!publicId) {
            throw new Error(`Could not extract public_id from URL: ${url}`);
        }

        // Auto-detect resource type if not provided
        if (!resourceType) {
            resourceType = detectResourceTypeFromUrl(url);
        }

        return await deleteMediaFromCloudinary(publicId, resourceType);
    } catch (error) {
        console.error(`Error deleting media by URL ${url}:`, error);
        throw error;
    }
};

module.exports = {
    createChatRoom,
    getUserChats,
    getChatMessages,
    deleteChatRoom,
    deleteMessage,
    deleteUserMessages,
    uploadMedia,
    deleteMediaFromCloudinary,
    deleteMediaFromCloudinaryByUrl
};