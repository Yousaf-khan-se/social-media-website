const postService = require('../services/postService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ResponseHandler = require('../utils/responseHandler');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');
const { findUserById } = require('../services/userService');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads');
        // Ensure upload directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename to prevent conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
        files: 10 // max 10 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/mov', 'video/avi'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}`), false);
        }
    }
});

const {
    validateCreatePost,
    validateUpdatePost,
    validateComment,
    validatePostId,
    validatePagination
} = require('../validators/postValidator');

// Create a new post
const createPost = async (req, res) => {
    try {
        // Validate request data
        const validation = validateCreatePost(req.body);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        // Add author ID to post data
        const postData = {
            ...req.body,
            author: req.user.userId
        };

        const post = await postService.createPost(postData);

        return ResponseHandler.created(res, {
            message: SUCCESS_MESSAGES.POST_CREATED,
            post
        });

    } catch (error) {
        console.error('Post creation error:', error);
        return ResponseHandler.internalError(res, ERROR_MESSAGES.POST_CREATION_FAILED);
    }
};

const addMediaToPost = [
    upload.array('media', 10), // max 10 files
    async (req, res) => {
        try {
            const { postId } = req.params;
            const mediaFiles = req.files;

            console.log('Media files received:', mediaFiles?.length || 0);

            if (!mediaFiles || mediaFiles.length === 0) {
                return ResponseHandler.badRequest(res, 'No media files uploaded');
            }

            // Validate file types and sizes
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/mov', 'video/avi'];
            const maxImageSize = 10 * 1024 * 1024; // 10MB for images
            const maxVideoSize = 100 * 1024 * 1024; // 100MB for videos

            for (const file of mediaFiles) {
                if (!validTypes.includes(file.mimetype)) {
                    return ResponseHandler.badRequest(res, `Invalid file type: ${file.mimetype}`);
                }

                const isVideo = file.mimetype.startsWith('video/');
                const maxSize = isVideo ? maxVideoSize : maxImageSize;

                if (file.size > maxSize) {
                    return ResponseHandler.badRequest(res, `File too large: ${file.originalname}. Max size: ${maxSize / (1024 * 1024)}MB`);
                }
            }

            const post = await postService.uploadMedia(postId, mediaFiles);

            return ResponseHandler.success(res, {
                post,
                message: `Successfully uploaded ${mediaFiles.length} media file(s)`,
                optimization_applied: true
            });

        } catch (error) {
            console.error('Add media to post error:', error);

            // Clean up any uploaded files on error
            if (req.files) {
                req.files.forEach(file => {
                    fs.unlink(file.path, () => { });
                });
            }

            return ResponseHandler.internalError(res, error.message || 'Failed to add media to post');
        }
    }
];

// Get post by ID
const getPost = async (req, res) => {
    try {
        const { postId } = req.params;

        // Validate post ID
        const validation = validatePostId(postId);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        const post = await postService.getPostById(postId);
        if (!post) {
            return ResponseHandler.notFound(res, ERROR_MESSAGES.POST_NOT_FOUND);
        }

        return ResponseHandler.success(res, { post });

    } catch (error) {
        console.error('Get post error:', error);
        return ResponseHandler.internalError(res, 'Failed to fetch post');
    }
};

// Get user's posts
const getUserPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page, limit } = req.query;

        // Validate pagination
        const paginationValidation = validatePagination(page, limit);
        if (!paginationValidation.isValid) {
            return ResponseHandler.validationError(res, paginationValidation.errors);
        }

        const posts = await postService.getPostsByUserId(
            userId,
            paginationValidation.page,
            paginationValidation.limit
        );

        return ResponseHandler.success(res, {
            posts,
            pagination: {
                page: paginationValidation.page,
                limit: paginationValidation.limit,
                total: posts.length
            }
        });

    } catch (error) {
        console.error('Get user posts error:', error);
        return ResponseHandler.internalError(res, 'Failed to fetch user posts');
    }
};

// Get current user's posts
const getMyPosts = async (req, res) => {
    try {
        const { page, limit } = req.query;

        // Validate pagination
        const paginationValidation = validatePagination(page, limit);
        if (!paginationValidation.isValid) {
            return ResponseHandler.validationError(res, paginationValidation.errors);
        }

        const posts = await postService.getPostsByUserId(
            req.user.userId,
            paginationValidation.page,
            paginationValidation.limit
        );

        return ResponseHandler.success(res, {
            posts,
            pagination: {
                page: paginationValidation.page,
                limit: paginationValidation.limit,
                total: posts.length
            }
        });

    } catch (error) {
        console.error('Get my posts error:', error);
        return ResponseHandler.internalError(res, 'Failed to fetch your posts');
    }
};

// Get feed posts (from followed users)
const getFeed = async (req, res) => {
    try {
        const { page, limit } = req.query;

        // Validate pagination
        const paginationValidation = validatePagination(page, limit);
        if (!paginationValidation.isValid) {
            return ResponseHandler.validationError(res, paginationValidation.errors);
        }

        // For now, we'll need to get user's following list
        // This would ideally come from a user service
        const followingIds = req.user.following || [];

        const posts = await postService.getFeedPosts(
            followingIds,
            paginationValidation.page,
            paginationValidation.limit
        );

        return ResponseHandler.success(res, {
            posts,
            pagination: {
                page: paginationValidation.page,
                limit: paginationValidation.limit,
                total: posts.length
            }
        });

    } catch (error) {
        console.error('Get feed error:', error);
        return ResponseHandler.internalError(res, 'Failed to fetch feed');
    }
};

// Get public posts (explore)
const getExplore = async (req, res) => {
    try {
        const { page, limit } = req.query;

        // Validate pagination
        const paginationValidation = validatePagination(page, limit);
        if (!paginationValidation.isValid) {
            return ResponseHandler.validationError(res, paginationValidation.errors);
        }

        const posts = await postService.getPublicPosts(
            paginationValidation.page,
            paginationValidation.limit
        );

        return ResponseHandler.success(res, {
            posts,
            pagination: {
                page: paginationValidation.page,
                limit: paginationValidation.limit,
                total: posts.length
            }
        });

    } catch (error) {
        console.error('Get explore posts error:', error);
        return ResponseHandler.internalError(res, 'Failed to fetch explore posts');
    }
};

// Update post
const updatePost = async (req, res) => {
    try {
        const { postId } = req.params;

        // Validate post ID
        const idValidation = validatePostId(postId);
        if (!idValidation.isValid) {
            return ResponseHandler.validationError(res, idValidation.errors);
        }

        // Validate update data
        const validation = validateUpdatePost(req.body);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        // Check if user owns the post
        const isOwner = await postService.checkPostOwnership(postId, req.user.userId);
        if (!isOwner) {
            return ResponseHandler.error(res, ERROR_MESSAGES.NOT_AUTHORIZED, 403);
        }

        const post = await postService.updatePost(postId, req.body);

        return ResponseHandler.success(res, {
            message: SUCCESS_MESSAGES.POST_UPDATED,
            post
        });

    } catch (error) {
        console.error('Post update error:', error);

        if (error.message === ERROR_MESSAGES.POST_NOT_FOUND) {
            return ResponseHandler.notFound(res, error.message);
        }

        return ResponseHandler.internalError(res, ERROR_MESSAGES.POST_UPDATE_FAILED);
    }
};

// Delete post
const deletePost = async (req, res) => {
    try {
        const { postId } = req.params;

        // Validate post ID
        const validation = validatePostId(postId);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        // Check if user owns the post
        const isOwner = await postService.checkPostOwnership(postId, req.user.userId);
        if (!isOwner) {
            return ResponseHandler.error(res, ERROR_MESSAGES.NOT_AUTHORIZED, 403);
        }

        // Get post to access media
        const post = await postService.getPostById(postId);
        if (!post) {
            return ResponseHandler.notFound(res, ERROR_MESSAGES.POST_NOT_FOUND);
        }

        // Delete media from Cloudinary
        if (Array.isArray(post.media) && post.media.length > 0) {
            console.log('Deleting media files from Cloudinary...');

            const deletePromises = post.media.map(async (mediaItem) => {
                try {
                    // Handle both old format (string URLs) and new format (objects)
                    if (typeof mediaItem === 'string') {
                        // Old format: direct URL string
                        return await postService.deleteMediaFromCloudinaryByUrl(mediaItem);
                    } else if (typeof mediaItem === 'object' && mediaItem.public_id) {
                        // New format: object with public_id and resource_type
                        return await postService.deleteMediaFromCloudinary(
                            mediaItem.public_id,
                            mediaItem.resource_type || 'image'
                        );
                    } else if (typeof mediaItem === 'object' && mediaItem.secure_url) {
                        // New format: object with secure_url
                        return await postService.deleteMediaFromCloudinaryByUrl(
                            mediaItem.secure_url,
                            mediaItem.resource_type || 'image'
                        );
                    }
                } catch (err) {
                    console.error('Error deleting individual media:', err);
                    // Continue with other deletions even if one fails
                    return null;
                }
            });

            // Wait for all deletions to complete
            const results = await Promise.allSettled(deletePromises);

            // Log results for debugging
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
            const failCount = results.filter(r => r.status === 'rejected').length;

            console.log(`Media deletion results: ${successCount} successful, ${failCount} failed`);

            // Log failed deletions for debugging
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Failed to delete media ${index}:`, result.reason);
                }
            });
        }

        // Delete the post from database
        await postService.deletePost(postId);

        return ResponseHandler.success(res, {
            message: SUCCESS_MESSAGES.POST_DELETED
        });

    } catch (error) {
        console.error('Post deletion error:', error);

        if (error.message === ERROR_MESSAGES.POST_NOT_FOUND) {
            return ResponseHandler.notFound(res, error.message);
        }

        return ResponseHandler.internalError(res, ERROR_MESSAGES.POST_DELETE_FAILED);
    }
};

// Like/Unlike post
const toggleLike = async (req, res) => {
    try {
        const { postId } = req.params;

        // Validate post ID
        const validation = validatePostId(postId);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        const result = await postService.toggleLike(postId, req.user.userId);

        return ResponseHandler.success(res, {
            message: result.isLiked ? SUCCESS_MESSAGES.POST_LIKED : SUCCESS_MESSAGES.POST_UNLIKED,
            post: result.post,
            isLiked: result.isLiked
        });

    } catch (error) {
        console.error('Toggle like error:', error);

        if (error.message === ERROR_MESSAGES.POST_NOT_FOUND) {
            return ResponseHandler.notFound(res, error.message);
        }

        return ResponseHandler.internalError(res, 'Failed to toggle like');
    }
};

// Share/Unshare post
const toggleShare = async (req, res) => {
    try {
        const { postId } = req.params;

        // Validate post ID
        const validation = validatePostId(postId);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        const result = await postService.toggleShare(postId, req.user.userId);

        return ResponseHandler.success(res, {
            message: result.isShared ? SUCCESS_MESSAGES.POST_SHARED : SUCCESS_MESSAGES.POST_UNSHARED,
            post: result.post,
            isShared: result.isShared
        });

    } catch (error) {
        console.error('Toggle share error:', error);

        if (error.message === ERROR_MESSAGES.POST_NOT_FOUND) {
            return ResponseHandler.notFound(res, error.message);
        }

        return ResponseHandler.internalError(res, 'Failed to toggle share');
    }
};

// Add comment to post
const addComment = async (req, res) => {
    try {
        const { postId } = req.params;

        // Validate post ID
        const idValidation = validatePostId(postId);
        if (!idValidation.isValid) {
            return ResponseHandler.validationError(res, idValidation.errors);
        }

        // Validate comment data
        const validation = validateComment(req.body);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        const commentData = {
            ...req.body,
            user: await findUserById(req.user.userId)
        };

        const post = await postService.addComment(postId, commentData);

        return ResponseHandler.success(res, {
            message: SUCCESS_MESSAGES.COMMENT_ADDED,
            post
        });

    } catch (error) {
        console.error('Add comment error:', error);

        if (error.message === ERROR_MESSAGES.POST_NOT_FOUND) {
            return ResponseHandler.notFound(res, error.message);
        }

        return ResponseHandler.internalError(res, 'Failed to add comment');
    }
};

// Delete comment
const deleteComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;

        // Validate post ID
        const validation = validatePostId(postId);
        if (!validation.isValid) {
            return ResponseHandler.validationError(res, validation.errors);
        }

        await postService.deleteComment(postId, commentId, req.user.userId);

        return ResponseHandler.success(res, {
            message: SUCCESS_MESSAGES.COMMENT_DELETED
        });

    } catch (error) {
        console.error('Delete comment error:', error);

        if (error.message === ERROR_MESSAGES.POST_NOT_FOUND || error.message === 'Comment not found') {
            return ResponseHandler.notFound(res, error.message);
        }

        if (error.message === 'Not authorized to delete this comment') {
            return ResponseHandler.error(res, error.message, 403);
        }

        return ResponseHandler.internalError(res, 'Failed to delete comment');
    }
};

// Search posts
const searchPosts = async (req, res) => {
    try {
        const { query, page, limit } = req.query;

        if (!query || query.trim().length === 0) {
            return ResponseHandler.badRequest(res, 'Search query is required');
        }

        // Validate pagination
        const paginationValidation = validatePagination(page, limit);
        if (!paginationValidation.isValid) {
            return ResponseHandler.validationError(res, paginationValidation.errors);
        }

        const posts = await postService.searchPosts(
            query.trim(),
            paginationValidation.page,
            paginationValidation.limit
        );

        return ResponseHandler.success(res, {
            posts,
            query: query.trim(),
            pagination: {
                page: paginationValidation.page,
                limit: paginationValidation.limit,
                total: posts.length
            }
        });

    } catch (error) {
        console.error('Search posts error:', error);
        return ResponseHandler.internalError(res, 'Failed to search posts');
    }
};

module.exports = {
    createPost,
    getPost,
    getUserPosts,
    getMyPosts,
    getFeed,
    getExplore,
    updatePost,
    deletePost,
    toggleLike,
    toggleShare,
    addComment,
    deleteComment,
    searchPosts,
    addMediaToPost
};
