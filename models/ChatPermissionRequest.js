const mongoose = require('mongoose');

const chatPermissionRequestSchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'denied'],
        default: 'pending'
    },
    message: {
        type: String,
        maxlength: 500,
        default: ''
    },
    // Store the original chat creation request data
    chatData: {
        participants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        isGroup: {
            type: Boolean,
            default: false
        },
        name: {
            type: String,
            default: ''
        }
    },
    respondedAt: {
        type: Date
    },
    expiresAt: {
        type: Date,
        default: function () {
            // Request expires after 7 days
            return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
chatPermissionRequestSchema.index({ recipient: 1, status: 1 });
chatPermissionRequestSchema.index({ requester: 1, recipient: 1 });
chatPermissionRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Prevent duplicate pending requests
chatPermissionRequestSchema.index(
    { requester: 1, recipient: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: 'pending' }
    }
);

module.exports = mongoose.model('ChatPermissionRequest', chatPermissionRequestSchema);
