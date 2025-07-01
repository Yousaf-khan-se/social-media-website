const Post = require('../models/Post');
const { ERROR_MESSAGES } = require('../constants/messages');

// Create a new post
const createPost = async (postData) => {
    const post = new Post(postData);
    await post.save();
    return await post.populate('author', 'username firstName lastName profilePicture');
};

// Get post by ID
const getPostById = async (postId) => {
    return await Post.findById(postId)
        .populate('author', 'username firstName lastName profilePicture')
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture');
};

// Get posts by user ID
const getPostsByUserId = async (userId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    return await Post.find({ author: userId, isPublic: true })
        .populate('author', 'username firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Get feed posts (posts from users that current user follows)
const getFeedPosts = async (followingIds, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    return await Post.find({
        author: { $in: followingIds },
        isPublic: true
    })
        .populate('author', 'username firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Get public posts (explore/discover feed)
const getPublicPosts = async (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    return await Post.find({ isPublic: true })
        .populate('author', 'username firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Update post
const updatePost = async (postId, updateData) => {
    return await Post.findByIdAndUpdate(
        postId,
        updateData,
        { new: true, runValidators: true }
    ).populate('author', 'username firstName lastName profilePicture');
};

// Delete post
const deletePost = async (postId) => {
    return await Post.findByIdAndDelete(postId);
};

// Like/Unlike post
const toggleLike = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) {
        throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
    }

    const likeIndex = post.likes.findIndex(like => like.user.toString() === userId.toString());

    if (likeIndex > -1) {
        // Unlike the post
        post.likes.splice(likeIndex, 1);
    } else {
        // Like the post
        post.likes.push({ user: userId });
    }

    await post.save();
    return await post.populate('author', 'username firstName lastName profilePicture');
};

// Add comment to post
const addComment = async (postId, commentData) => {
    const post = await Post.findById(postId);
    if (!post) {
        throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
    }

    post.comments.push(commentData);
    await post.save();

    return await post.populate([
        { path: 'author', select: 'username firstName lastName profilePicture' },
        { path: 'comments.user', select: 'username firstName lastName profilePicture' }
    ]);
};

// Delete comment from post
const deleteComment = async (postId, commentId, userId) => {
    const post = await Post.findById(postId);
    if (!post) {
        throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
        throw new Error('Comment not found');
    }

    // Check if user owns the comment or the post
    if (comment.user.toString() !== userId.toString() && post.author.toString() !== userId.toString()) {
        throw new Error('Not authorized to delete this comment');
    }

    post.comments.pull(commentId);
    await post.save();

    return post;
};

// Search posts by content or tags
const searchPosts = async (query, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    return await Post.find({
        isPublic: true,
        $or: [
            { content: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
        ]
    })
        .populate('author', 'username firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Get posts by tag
const getPostsByTag = async (tag, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    return await Post.find({
        tags: tag,
        isPublic: true
    })
        .populate('author', 'username firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Check if user owns the post
const checkPostOwnership = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) {
        throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
    }

    return post.author.toString() === userId.toString();
};

module.exports = {
    createPost,
    getPostById,
    getPostsByUserId,
    getFeedPosts,
    getPublicPosts,
    updatePost,
    deletePost,
    toggleLike,
    addComment,
    deleteComment,
    searchPosts,
    getPostsByTag,
    checkPostOwnership
};
