const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chatRoom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video', 'file'],
        default: 'text'
    },
    caption: { //works only for media messages
        type: String,
        trim: true,
        default: ''
    },
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true
    }],
    seenBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

messageSchema.index({ chatRoom: 1, createdAt: -1 }); // For fast pagination per chat
messageSchema.index({ sender: 1 }); // Optional: for user-based queries

module.exports = mongoose.model('Message', messageSchema);
