const postService = require('../services/postService');

const {
    validateCreatePost,
    validateUpdatePost,
    validateComment,
    validatePostId,
    validatePagination
} = require('../validators/postValidator');

const ResponseHandler = require('../utils/responseHandler');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../constants/messages');

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

        const post = await postService.toggleLike(postId, req.user.userId);
        const isLiked = post.isLikedBy(req.user.userId);

        return ResponseHandler.success(res, {
            message: isLiked ? SUCCESS_MESSAGES.POST_LIKED : SUCCESS_MESSAGES.POST_UNLIKED,
            post,
            isLiked
        });

    } catch (error) {
        console.error('Toggle like error:', error);

        if (error.message === ERROR_MESSAGES.POST_NOT_FOUND) {
            return ResponseHandler.notFound(res, error.message);
        }

        return ResponseHandler.internalError(res, 'Failed to toggle like');
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
            user: req.user.userId
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
        const { q: query, page, limit } = req.query;

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
    addComment,
    deleteComment,
    searchPosts
};
