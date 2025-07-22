const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'like',
            'comment',
            'share',
            'follow',
            'message',
            'chat_created',
            'group_created',
            'group_added'
        ],
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 100
    },
    body: {
        type: String,
        required: true,
        maxlength: 500
    },
    data: {
        // Additional data based on notification type
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post'
        },
        chatRoomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatRoom'
        },
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message'
        },
        commentId: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    isDelivered: {
        type: Boolean,
        default: false
    },
    deliveredAt: {
        type: Date
    },
    readAt: {
        type: Date
    },
    // Firebase Cloud Messaging response data
    fcmResponse: {
        messageId: String,
        error: String
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1 });

// Auto-delete notifications older than 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Notification', notificationSchema);
