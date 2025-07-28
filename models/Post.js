const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    content: {
        type: String,
        required: [true, 'Post content is required'],
        maxlength: [2000, 'Post content cannot exceed 2000 characters'],
        trim: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Post author is required']
    },
    media: {
        type: [
            {
                secure_url: { type: String, required: true },
                public_id: { type: String, required: true },
                resource_type: { type: String },
                format: { type: String },
                width: { type: Number },
                height: { type: Number },
                bytes: { type: Number },
                eager: { type: Array },
                responsive_urls: { type: Object },
                uploaded_at: { type: Date }
            }
        ],
        validate: {
            validator: function (arr) {
                return arr.length <= 10; // Maximum 10 media files per post
            },
            message: 'Cannot upload more than 10 media files per post'
        }
    },
    likes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        likedAt: {
            type: Date,
            default: Date.now
        }
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: [true, 'Comment content is required'],
            maxlength: [500, 'Comment cannot exceed 500 characters'],
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        likes: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            likedAt: {
                type: Date,
                default: Date.now
            }
        }],
        replies: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            content: {
                type: String,
                required: [true, 'Reply content is required'],
                maxlength: [500, 'Reply cannot exceed 500 characters'],
                trim: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }]
    }],
    shares: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        sharedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isPublic: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [30, 'Tag cannot exceed 30 characters']
    }],
    location: {
        type: String,
        maxlength: [100, 'Location cannot exceed 100 characters'],
        trim: true
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        content: String,
        editedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for like count
postSchema.virtual('likeCount').get(function () {
    return this.likes ? this.likes.length : 0;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function () {
    return this.comments ? this.comments.length : 0;
});

// Virtual for share count
postSchema.virtual('shareCount').get(function () {
    return this.shares ? this.shares.length : 0;
});

// Index for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ isPublic: 1, createdAt: -1 });

// Method to check if user liked the post
postSchema.methods.isLikedBy = function (userId) {
    return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to get user's comment on the post
postSchema.methods.getUserComment = function (userId) {
    return this.comments.find(comment => comment.user.toString() === userId.toString());
};

// Pre-save middleware to handle edit history
postSchema.pre('save', function (next) {
    if (this.isModified('content') && !this.isNew) {
        this.isEdited = true;
        // Add to edit history if content changed
        if (this.editHistory.length === 0 || this.editHistory[this.editHistory.length - 1].content !== this.content) {
            this.editHistory.push({
                content: this.content,
                editedAt: new Date()
            });
        }
    }
    next();
});

module.exports = mongoose.model('Post', postSchema);
