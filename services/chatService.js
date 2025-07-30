const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
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
const createChatRoom = async (participants, isGroup = false, name = '', creatorId = null) => {
    try {
        // For one-on-one chats, check privacy settings
        if (!isGroup && participants.length === 2) {
            const otherUserId = participants.find(id => id !== creatorId);
            if (otherUserId && creatorId) {
                const canMessage = await settingsService.canUserMessage(creatorId, otherUserId);
                if (!canMessage.canMessage) {
                    throw new Error(canMessage.reason);
                }
            }

            // Check if it's a one-on-one chat that already exists
            const existingChat = await ChatRoom.findOne({
                isGroup: false,
                participants: { $all: participants, $size: 2 }
            }).populate('participants', 'username firstName lastName profilePicture');

            if (existingChat) {
                return existingChat;
            }
        }

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
        notificationService.sendChatCreatedNotification(chatRoom._id, creatorId || participants[0])
            .catch(err => console.error('Chat creation notification error:', err));

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
            participants: userId
        })
            .populate('participants', 'username firstName lastName profilePicture isOnline')
            .populate({
                path: 'lastMessage',
                populate: {
                    path: 'sender',
                    select: 'username firstName lastName profilePicture'
                }
            })
            .sort({ updatedAt: -1 });

        return chats;
    } catch (error) {
        console.error('Error fetching user chats:', error);
        throw error;
    }
};

// Get chat messages with pagination
const getChatMessages = async (roomId, page = 1, limit = 50) => {
    try {
        const skip = (page - 1) * limit;

        const messages = await Message.find({ chatRoom: roomId })
            .populate('sender', 'username firstName lastName profilePicture')
            .populate('seenBy', 'username firstName lastName profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalMessages = await Message.countDocuments({ chatRoom: roomId });
        const totalPages = Math.ceil(totalMessages / limit);

        return {
            messages: messages.reverse(), // Reverse to show oldest first
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

// Delete a chat room
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

        // Delete all messages in the chat room
        await Message.deleteMany({ chatRoom: roomId });

        // Delete the chat room
        await ChatRoom.findByIdAndDelete(roomId);

        return { success: true, message: 'Chat deleted successfully' };
    } catch (error) {
        console.error('Error deleting chat room:', error);
        throw error;
    }
};

// Delete a message
const deleteMessage = async (messageId, userId) => {
    try {
        const message = await Message.findById(messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        // Check if user is the sender
        if (message.sender.toString() !== userId) {
            throw new Error('Not authorized to delete this message');
        }

        // If message has media, delete from cloudinary
        if (message.messageType !== 'text' && message.content) {
            try {
                await deleteMediaFromCloudinaryByUrl(message.content);
            } catch (mediaError) {
                console.error('Error deleting media from cloudinary:', mediaError);
                // Continue with message deletion even if media deletion fails
            }
        }

        await Message.findByIdAndDelete(messageId);

        // Update last message in chat room if this was the last message
        const chatRoom = await ChatRoom.findById(message.chatRoom);
        if (chatRoom && chatRoom.lastMessage && chatRoom.lastMessage.toString() === messageId) {
            const lastMessage = await Message.findOne({ chatRoom: message.chatRoom })
                .sort({ createdAt: -1 });

            chatRoom.lastMessage = lastMessage ? lastMessage._id : null;
            await chatRoom.save();
        }

        return { success: true, message: 'Message deleted successfully' };
    } catch (error) {
        console.error('Error deleting message:', error);
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
    uploadMedia,
    deleteMediaFromCloudinary,
    deleteMediaFromCloudinaryByUrl
};