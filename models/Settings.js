const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    // Privacy Settings
    privacy: {
        // Profile visibility
        profileVisibility: {
            type: String,
            enum: ['public', 'followers', 'private'],
            default: 'public'
        },
        showLastSeen: {
            type: Boolean,
            default: true
        },
        showOnlineStatus: {
            type: Boolean,
            default: true
        },

        // Posts privacy
        defaultPostVisibility: {
            type: String,
            enum: ['public', 'followers', 'private'],
            default: 'public'
        },
        allowPostSharing: {
            type: Boolean,
            default: true
        },

        // Contact settings
        whoCanMessageMe: {
            type: String,
            enum: ['everyone', 'followers', 'nobody'],
            default: 'everyone'
        },
        whoCanFollowMe: {
            type: String,
            enum: ['everyone', 'manual_approval'],
            default: 'everyone'
        },
        whoCanSeeMyFollowers: {
            type: String,
            enum: ['everyone', 'followers', 'private'],
            default: 'everyone'
        },
        whoCanSeeMyFollowing: {
            type: String,
            enum: ['everyone', 'followers', 'private'],
            default: 'everyone'
        },

        // Search and discovery
        allowSearchByEmail: {
            type: Boolean,
            default: false
        },
        allowSearchByUsername: {
            type: Boolean,
            default: true
        },
        showInSuggestions: {
            type: Boolean,
            default: true
        }
    },

    // Notification Settings (expanded from User model)
    notifications: {
        // Push notifications
        pushNotifications: {
            type: Boolean,
            default: true
        },

        // Post interactions
        likes: {
            type: Boolean,
            default: true
        },
        comments: {
            type: Boolean,
            default: true
        },
        shares: {
            type: Boolean,
            default: true
        },

        // Social interactions
        follows: {
            type: Boolean,
            default: true
        },
        followerRequests: {
            type: Boolean,
            default: true
        },

        // Chat notifications
        messages: {
            type: Boolean,
            default: true
        },
        groupChats: {
            type: Boolean,
            default: true
        },
        messagePreview: {
            type: Boolean,
            default: true
        },

        // Email notifications
        emailNotifications: {
            type: Boolean,
            default: false
        },
        weeklyDigest: {
            type: Boolean,
            default: false
        },

        // Notification timing
        quietHours: {
            enabled: {
                type: Boolean,
                default: false
            },
            startTime: {
                type: String,
                default: '22:00'
            },
            endTime: {
                type: String,
                default: '08:00'
            }
        }
    },

    // Account & Security Settings
    security: {
        // Two-factor authentication
        twoFactorEnabled: {
            type: Boolean,
            default: false
        },
        backupCodes: [{
            type: String
        }],

        // Login activity
        loginAlerts: {
            type: Boolean,
            default: true
        },
        logoutOtherDevices: {
            type: Boolean,
            default: false
        },

        // Account security
        passwordLastChanged: {
            type: Date,
            default: Date.now
        },
        securityQuestionSet: {
            type: Boolean,
            default: false
        }
    },

    // Chat & Messaging Settings
    chat: {
        // Message delivery
        readReceipts: {
            type: Boolean,
            default: true
        },
        typingIndicators: {
            type: Boolean,
            default: true
        },
        lastSeenInGroups: {
            type: Boolean,
            default: true
        },

        // Auto-download settings
        autoDownloadImages: {
            type: String,
            enum: ['never', 'wifi', 'always'],
            default: 'wifi'
        },
        autoDownloadVideos: {
            type: String,
            enum: ['never', 'wifi', 'always'],
            default: 'never'
        },
        autoDownloadFiles: {
            type: String,
            enum: ['never', 'wifi', 'always'],
            default: 'never'
        },

        // Message management
        autoDeleteMessages: {
            enabled: {
                type: Boolean,
                default: false
            },
            duration: {
                type: Number, // days
                default: 30
            }
        },

        // Backup
        backupChats: {
            type: Boolean,
            default: false
        }
    },

    // Content & Media Settings
    content: {
        // Data usage
        highQualityUploads: {
            type: Boolean,
            default: true
        },
        compressImages: {
            type: Boolean,
            default: false
        },

        // Content filtering
        contentFilter: {
            type: String,
            enum: ['none', 'mild', 'strict'],
            default: 'mild'
        },
        hideOffensiveContent: {
            type: Boolean,
            default: true
        },

        // Language & Region
        language: {
            type: String,
            default: 'en'
        },
        timezone: {
            type: String,
            default: 'UTC'
        },
        dateFormat: {
            type: String,
            enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
            default: 'MM/DD/YYYY'
        }
    },

    // Accessibility Settings
    accessibility: {
        fontSize: {
            type: String,
            enum: ['small', 'medium', 'large', 'extra-large'],
            default: 'medium'
        },
        highContrast: {
            type: Boolean,
            default: false
        },
        reducedMotion: {
            type: Boolean,
            default: false
        },
        screenReader: {
            type: Boolean,
            default: false
        }
    },

    // App Preferences
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'light'
        },
        autoPlayVideos: {
            type: Boolean,
            default: true
        },
        soundEnabled: {
            type: Boolean,
            default: true
        },
        hapticFeedback: {
            type: Boolean,
            default: true
        }
    },

    // Blocked Users & Content
    blocked: {
        users: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            blockedAt: {
                type: Date,
                default: Date.now
            },
            reason: {
                type: String,
                maxlength: 200
            }
        }],
        keywords: [{
            keyword: {
                type: String,
                required: true
            },
            addedAt: {
                type: Date,
                default: Date.now
            }
        }]
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for better query performance
settingsSchema.index({ 'blocked.users.user': 1 });

// Virtual for total blocked users count
settingsSchema.virtual('blockedUsersCount').get(function () {
    return this.blocked.users ? this.blocked.users.length : 0;
});

// Virtual for total blocked keywords count
settingsSchema.virtual('blockedKeywordsCount').get(function () {
    return this.blocked.keywords ? this.blocked.keywords.length : 0;
});

// Static method to get or create settings for a user
settingsSchema.statics.getOrCreateForUser = async function (userId) {
    let settings = await this.findOne({ user: userId }).populate('blocked.users.user', 'username firstName lastName profilePicture');

    if (!settings) {
        settings = new this({ user: userId });
        await settings.save();
        await settings.populate('blocked.users.user', 'username firstName lastName profilePicture');
    }

    return settings;
};

// Method to block a user
settingsSchema.methods.blockUser = function (userId, reason = '') {
    const existingBlock = this.blocked.users.find(block =>
        block.user.toString() === userId.toString()
    );

    if (!existingBlock) {
        this.blocked.users.push({
            user: userId,
            reason: reason,
            blockedAt: new Date()
        });
    }

    return this.save();
};

// Method to unblock a user
settingsSchema.methods.unblockUser = function (userId) {
    this.blocked.users = this.blocked.users.filter(block =>
        block.user.toString() !== userId.toString()
    );

    return this.save();
};

// Method to check if user is blocked
settingsSchema.methods.isUserBlocked = function (userId) {
    return this.blocked.users.some(block =>
        block.user.toString() === userId.toString()
    );
};

// Method to add blocked keyword
settingsSchema.methods.addBlockedKeyword = function (keyword) {
    const existingKeyword = this.blocked.keywords.find(k =>
        k.keyword.toLowerCase() === keyword.toLowerCase()
    );

    if (!existingKeyword) {
        this.blocked.keywords.push({
            keyword: keyword.toLowerCase(),
            addedAt: new Date()
        });
    }

    return this.save();
};

// Method to remove blocked keyword
settingsSchema.methods.removeBlockedKeyword = function (keyword) {
    this.blocked.keywords = this.blocked.keywords.filter(k =>
        k.keyword.toLowerCase() !== keyword.toLowerCase()
    );

    return this.save();
};

module.exports = mongoose.model('Settings', settingsSchema);
