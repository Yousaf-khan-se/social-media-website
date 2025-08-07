const notificationService = require('../services/notificationService');
const Notification = require('../models/Notification');
const ResponseHandler = require('../utils/responseHandler');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');
const mongoose = require('mongoose');

/**
 * Get user notifications with pagination
 */
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 20, type, unreadOnly = false } = req.query;

        const skip = (page - 1) * limit;
        const query = { recipient: userId };

        if (type) {
            query.type = type;
        }

        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const [notifications, totalCount, unreadCount] = await Promise.all([
            Notification.find(query)
                .populate('sender', 'firstName lastName username profilePicture')
                .populate('data.postId', 'content media')
                .populate('data.chatRoomId', 'name isGroup participants')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Notification.countDocuments(query),
            Notification.countDocuments({ recipient: userId, isRead: false })
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return ResponseHandler.success(res, {
            notifications,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCount,
                hasMore: page < totalPages
            },
            unreadCount,
            message: 'Notifications fetched successfully'
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        return ResponseHandler.internalError(res, 'Failed to fetch notifications');
    }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.userId;

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            {
                isRead: true,
                readAt: new Date()
            },
            { new: true }
        );

        if (!notification) {
            return ResponseHandler.notFound(res, 'Notification not found');
        }

        return ResponseHandler.success(res, {
            notification,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark notification as read error:', error);
        return ResponseHandler.internalError(res, 'Failed to update notification');
    }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await Notification.updateMany(
            { recipient: userId, isRead: false },
            {
                isRead: true,
                readAt: new Date()
            }
        );

        return ResponseHandler.success(res, {
            updatedCount: result.modifiedCount,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        return ResponseHandler.internalError(res, 'Failed to update notifications');
    }
};

/**
 * Delete notification
 */
const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.userId;

        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: userId
        });

        if (!notification) {
            return ResponseHandler.notFound(res, 'Notification not found');
        }

        return ResponseHandler.success(res, {
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        return ResponseHandler.internalError(res, 'Failed to delete notification');
    }
};

/**
 * Clear all notifications
 */
const clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await Notification.deleteMany({
            recipient: userId
        });

        return ResponseHandler.success(res, {
            deletedCount: result.deletedCount,
            message: 'All notifications cleared successfully'
        });

    } catch (error) {
        console.error('Clear all notifications error:', error);
        return ResponseHandler.internalError(res, 'Failed to clear notifications');
    }
};

/**
 * Add FCM token for push notifications
 */
const addFCMToken = async (req, res) => {
    try {
        const { token, device = 'web' } = req.body;
        const userId = req.user.userId;

        if (!token) {
            return ResponseHandler.badRequest(res, 'FCM token is required');
        }

        const result = await notificationService.addFCMToken(userId, token, device);

        return ResponseHandler.success(res, {
            ...result,
            message: 'FCM token added successfully'
        });

    } catch (error) {
        console.error('Add FCM token error:', error);
        return ResponseHandler.internalError(res, 'Failed to add FCM token');
    }
};

/**
 * Remove FCM token
 */
const removeFCMToken = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.userId;

        if (!token) {
            return ResponseHandler.badRequest(res, 'FCM token is required');
        }

        const result = await notificationService.removeFCMToken(userId, token);

        return ResponseHandler.success(res, {
            ...result,
            message: 'FCM token removed successfully'
        });

    } catch (error) {
        console.error('Remove FCM token error:', error);
        return ResponseHandler.internalError(res, 'Failed to remove FCM token');
    }
};

const checkFCMToken = async (req, res) => {
    try {
        const { token } = req.query;
        const userId = req.user.userId;

        if (!token) {
            return ResponseHandler.badRequest(res, 'FCM token is required');
        }

        const result = await notificationService.checkFCMToken(userId, token);

        if (!result) return ResponseHandler.notFound(res, 'FCM token not found');

        return ResponseHandler.success(res, {
            message: 'FCM token checked successfully'
        });

    } catch (error) {
        console.error('Check FCM token error:', error);
        return ResponseHandler.internalError(res, 'Failed to check FCM token');
    }
};


const getNotificationStats = async (req, res) => {
    try {
        const userId = req.user.userId;

        const stats = await Notification.aggregate([
            { $match: { recipient: mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
                    byType: {
                        $push: {
                            type: '$type',
                            isRead: '$isRead'
                        }
                    }
                }
            },
            {
                $project: {
                    total: 1,
                    unread: 1,
                    read: { $subtract: ['$total', '$unread'] },
                    typeBreakdown: {
                        $reduce: {
                            input: '$byType',
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    '$$value',
                                    {
                                        $cond: [
                                            { $not: { $ifNull: [`$$value.$$this.type`, false] } },
                                            { [`$$this.type`]: { total: 1, unread: { $cond: [{ $eq: ['$$this.isRead', false] }, 1, 0] } } },
                                            {
                                                [`$$this.type`]: {
                                                    total: { $add: [`$$value.$$this.type.total`, 1] },
                                                    unread: {
                                                        $add: [
                                                            `$$value.$$this.type.unread`,
                                                            { $cond: [{ $eq: ['$$this.isRead', false] }, 1, 0] }
                                                        ]
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        ]);

        const result = stats[0] || { total: 0, unread: 0, read: 0, typeBreakdown: {} };

        return ResponseHandler.success(res, {
            stats: result,
            message: 'Notification statistics fetched successfully'
        });

    } catch (error) {
        console.error('Get notification stats error:', error);
        return ResponseHandler.internalError(res, 'Failed to fetch notification statistics');
    }
};

module.exports = {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    addFCMToken,
    removeFCMToken,
    getNotificationStats,
    checkFCMToken
};
