const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');

const onlineUsers = new Map(); // Track online users and their rooms

// Chat socket handler
module.exports = function registerChatSocket(io) {
    io.on('connection', async (socket) => {
        console.log(`🟢 Socket connected: ${socket.id} - User: ${socket.user.userId}`);

        // Fetch all rooms the user belongs to
        const userRooms = await ChatRoom.find({ participants: socket.user.userId }).select('_id').lean();
        const roomIds = userRooms.map(room => room._id.toString());

        // Store user's rooms in memory
        onlineUsers.set(socket.user.userId, roomIds);

        // Broadcast online status to all rooms
        roomIds.forEach(roomId => {
            socket.to(roomId).emit('userOnline', {
                user: {
                    id: socket.user.userId,
                    username: socket.user.username,
                    firstName: socket.user.firstName,
                    lastName: socket.user.lastName,
                    profilePicture: socket.user.profilePicture
                }
            });
        });

        // Join user to their personal room (for notifications)
        socket.join(`user_${socket.user.userId}`);

        // Join chat room
        socket.on('joinRoom', async ({ roomId }) => {
            try {
                // Verify user is a participant of the room
                const chatRoom = await ChatRoom.findById(roomId);
                if (!chatRoom) {
                    socket.emit('error', { message: 'Chat room not found' });
                    return;
                }

                if (!chatRoom.participants.includes(socket.user.userId)) {
                    socket.emit('error', { message: 'Not authorized to join this room' });
                    return;
                }

                socket.join(roomId);
                console.log(`User ${socket.user.username || socket.user.userId} joined room: ${roomId}`);

                // Notify other users in the room
                socket.to(roomId).emit('userJoined', {
                    user: {
                        id: socket.user.userId,
                        username: socket.user.username,
                        firstName: socket.user.firstName,
                        lastName: socket.user.lastName,
                        profilePicture: socket.user.profilePicture
                    }
                });

            } catch (error) {
                console.error('Error joining room:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // Leave chat room
        socket.on('leaveRoom', ({ roomId }) => {
            socket.leave(roomId);
            console.log(`User ${socket.user.username || socket.user.userId} left room: ${roomId}`);

            // Notify other users in the room
            socket.to(roomId).emit('userLeft', {
                user: {
                    id: socket.user.userId,
                    username: socket.user.username,
                    firstName: socket.user.firstName,
                    lastName: socket.user.lastName,
                    profilePicture: socket.user.profilePicture
                }
            });
        });

        // Send message
        socket.on('sendMessage', async (data) => {
            try {
                const { roomId, content, messageType = 'text', caption = '' } = data;

                // Verify user is a participant of the room
                const chatRoom = await ChatRoom.findById(roomId);
                if (!chatRoom) {
                    socket.emit('error', { message: 'Chat room not found' });
                    return;
                }

                if (!chatRoom.participants.includes(socket.user.userId)) {
                    socket.emit('error', { message: 'Not authorized to send messages to this room' });
                    return;
                }

                // Create and save message
                const message = new Message({
                    chatRoom: roomId,
                    sender: socket.user.userId,
                    content: content,
                    messageType: messageType,
                    caption: caption
                });

                await message.save();

                // Populate sender info
                await message.populate('sender', 'username firstName lastName profilePicture');

                // Update last message in chat room
                chatRoom.lastMessage = message._id;
                await chatRoom.save();

                // Emit message to all users in the room
                io.to(roomId).emit('receiveMessage', {
                    _id: message._id,
                    chatRoom: message.chatRoom,
                    sender: message.sender,
                    content: message.content,
                    messageType: message.messageType,
                    caption: message.caption,
                    seenBy: message.seenBy,
                    createdAt: message.createdAt,
                    updatedAt: message.updatedAt
                });

                console.log(`Message sent in room ${roomId} by ${socket.user.username || socket.user.userId}`);

            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Typing indicator
        socket.on('typing', ({ roomId, isTyping }) => {
            socket.to(roomId).emit('userTyping', {
                user: {
                    id: socket.user.userId,
                    username: socket.user.username,
                    firstName: socket.user.firstName,
                    lastName: socket.user.lastName,
                    profilePicture: socket.user.profilePicture
                },
                isTyping
            });
        });

        // Mark message as seen
        socket.on('markAsSeen', async ({ messageId }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) {
                    socket.emit('error', { message: 'Message not found' });
                    return;
                }

                // Verify user is a participant of the room
                const chatRoom = await ChatRoom.findById(message.chatRoom);
                if (!chatRoom || !chatRoom.participants.includes(socket.user.userId)) {
                    socket.emit('error', { message: 'Not authorized' });
                    return;
                }

                // Add user to seenBy array if not already present
                if (!message.seenBy.includes(socket.user.userId)) {
                    message.seenBy.push(socket.user.userId);
                    await message.save();
                }

                // Emit seen status to all users in the room
                io.to(message.chatRoom.toString()).emit('messageSeen', {
                    messageId: message._id,
                    seenBy: message.seenBy,
                    user: {
                        id: socket.user.userId,
                        username: socket.user.username,
                        firstName: socket.user.firstName,
                        lastName: socket.user.lastName,
                        profilePicture: socket.user.profilePicture
                    }
                });

            } catch (error) {
                console.error('Error marking message as seen:', error);
                socket.emit('error', { message: 'Failed to mark message as seen' });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`🔴 Socket disconnected: ${socket.id} - User: ${socket.user.username || socket.user.userId}`);

            // Get user's rooms from memory
            const userRooms = onlineUsers.get(socket.user.userId) || [];

            // Broadcast offline status to all rooms
            userRooms.forEach(roomId => {
                socket.to(roomId).emit('userOffline', {
                    user: {
                        id: socket.user.userId,
                        username: socket.user.username,
                        firstName: socket.user.firstName,
                        lastName: socket.user.lastName,
                        profilePicture: socket.user.profilePicture
                    }
                });
            });

            // Remove user from memory
            onlineUsers.delete(socket.user.userId);
        });
    });
};
