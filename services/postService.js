const Post = require('../models/Post');
const { ERROR_MESSAGES } = require('../constants/messages');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv').config();
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function for standardized post population
const getPostPopulationConfig = () => [
    { path: 'author', select: 'username firstName lastName profilePicture' },
    { path: 'comments.user', select: 'username firstName lastName profilePicture' },
    { path: 'likes.user', select: 'username firstName lastName profilePicture' },
    { path: 'shares.user', select: 'username firstName lastName profilePicture' },
    { path: 'comments.replies.user', select: 'username firstName lastName profilePicture' }
];

// Helper function to get populated post by ID
const getPopulatedPost = async (postId) => {
    return await Post.findById(postId).populate(getPostPopulationConfig());
};

// Create a new post
const createPost = async (postData) => {
    const post = new Post(postData);
    await post.save();
    return await post.populate(getPostPopulationConfig());
};

// Get post by ID
const getPostById = async (postId) => {
    return await getPopulatedPost(postId);
};

// Get posts by user ID
const getPostsByUserId = async (userId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    return await Post.find({ author: userId, isPublic: true })
        .populate(getPostPopulationConfig())
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
        .populate(getPostPopulationConfig())
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Get public posts (explore/discover feed)
const getPublicPosts = async (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    return await Post.find({ isPublic: true })
        .populate(getPostPopulationConfig())
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
    )
        .populate(getPostPopulationConfig());
};

// Delete post
const deletePost = async (postId) => {
    try {
        const post = await Post.findById(postId);
        if (!post) {
            throw new Error('Post not found');
        }

        // Delete all media files from Cloudinary if they exist
        if (post.media && post.media.length > 0) {
            const mediaDeletePromises = post.media.map(async (media) => {
                try {
                    if (media.public_id) {
                        console.log(`Deleting media from Cloudinary: ${media.public_id}`);
                        await deleteMediaFromCloudinary(media.public_id, media.resource_type || 'image');
                        console.log(`Successfully deleted media: ${media.public_id}`);
                    }
                } catch (mediaError) {
                    console.error(`Error deleting media ${media.public_id} from Cloudinary:`, mediaError);
                    // Continue with deletion even if some media fails to delete
                }
            });

            // Wait for all media deletion attempts to complete
            await Promise.allSettled(mediaDeletePromises);
        }

        // Delete the post from database
        const deletedPost = await Post.findByIdAndDelete(postId);

        return deletedPost;
    } catch (error) {
        console.error('Error deleting post:', error);
        throw error;
    }
};

// Like/Unlike post
const toggleLike = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) {
        throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
    }

    const likeIndex = post.likes.findIndex(like => like.user.toString() === userId.toString());
    let isLiked = false;

    if (likeIndex > -1) {
        // Unlike the post
        post.likes.splice(likeIndex, 1);
        isLiked = false;
    } else {
        // Like the post
        post.likes.push({ user: userId });
        isLiked = true;

        // Send notification for new like (only if not liking own post)
        if (post.author.toString() !== userId.toString()) {
            const notificationService = require('./notificationService');
            // Non-blocking notification
            notificationService.sendPostNotification(
                postId,
                userId,
                post.author.toString(),
                'like'
            ).catch(err => console.error('Like notification error:', err));
        }
    }

    await post.save();
    const updatedPost = await Post.findById(post._id)
        .populate(getPostPopulationConfig());

    return { post: updatedPost, isLiked };
};

// Add comment to post
const addComment = async (postId, commentData) => {
    try {
        const post = await Post.findById(postId);
        if (!post) {
            throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
        }

        post.comments.push(commentData);
        await post.save();

        // Send notification for new comment (only if not commenting on own post)
        if (post.author.toString() !== commentData.user.toString()) {
            const notificationService = require('./notificationService');
            // Non-blocking notification

            notificationService.sendPostNotification(
                postId,
                commentData.user,
                post.author.toString(),
                'comment',
                { commentContent: commentData.content }
            ).catch(err => console.error('Comment notification error:', err));
        }

        // Return populated post in a single query
        return await getPopulatedPost(post._id);

    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
};

// Add comment reply to post
const addCommentReply = async (postId, commentId, commentReply) => {
    try {
        const post = await Post.findById(postId);
        if (!post) {
            throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            throw new Error(ERROR_MESSAGES.COMMENT_NOT_FOUND || 'Comment not found');
        }

        // Add the reply to the comment
        comment.replies.push(commentReply);
        await post.save();

        // Send notification for new reply (only if not replying to own comment or post)
        const shouldNotifyPostAuthor = post.author.toString() !== commentReply.user.toString();
        const shouldNotifyCommentAuthor = comment.user.toString() !== commentReply.user.toString();

        if (shouldNotifyPostAuthor || shouldNotifyCommentAuthor) {
            const notificationService = require('./notificationService');

            // Notify post author if different from reply author
            if (shouldNotifyPostAuthor) {
                notificationService.sendPostNotification(
                    postId,
                    commentReply.user,
                    post.author.toString(),
                    'comment',
                    {
                        commentContent: commentReply.content,
                        isReply: true,
                        parentCommentId: commentId,
                        isCommentReply: true
                    }
                ).catch(err => console.error('Comment Reply notification to post author error:', err));
            }

            // Notify original comment author if different from both reply author and post author
            if (shouldNotifyCommentAuthor && comment.user.toString() !== post.author.toString()) {
                notificationService.sendPostNotification(
                    postId,
                    commentReply.user,
                    comment.user.toString(),
                    'comment',
                    {
                        commentContent: commentReply.content,
                        isReply: true,
                        parentCommentId: commentId
                    }
                ).catch(err => console.error('Reply notification to comment author error:', err));
            }
        }

        // Return populated post in a single query
        return await getPopulatedPost(post._id);

    } catch (error) {
        console.error('Error adding comment reply:', error);
        throw error;
    }
};

// Delete comment reply from post
const deleteCommentReply = async (postId, commentId, replyId, userId) => {
    try {
        const post = await Post.findById(postId);
        if (!post) {
            throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            throw new Error(ERROR_MESSAGES.COMMENT_NOT_FOUND || 'Comment not found');
        }

        const reply = comment.replies.id(replyId);
        if (!reply) {
            throw new Error('Reply not found');
        }

        // Check authorization: user owns the reply, comment, or post
        const canDelete = reply.user.toString() === userId.toString() ||
            comment.user.toString() === userId.toString() ||
            post.author.toString() === userId.toString();

        if (!canDelete) {
            throw new Error('Not authorized to delete this reply');
        }

        // Remove the reply
        comment.replies.pull(replyId);
        await post.save();

        // Return populated post in a single query
        return await getPopulatedPost(post._id);

    } catch (error) {
        console.error('Error deleting comment reply:', error);
        throw error;
    }
};


// Delete comment from post
const deleteComment = async (postId, commentId, userId) => {
    try {
        const post = await Post.findById(postId);
        if (!post) {
            throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
        }

        const comment = post.comments.id(commentId);
        if (!comment) {
            throw new Error(ERROR_MESSAGES.COMMENT_NOT_FOUND || 'Comment not found');
        }

        // Check authorization: user owns the comment or the post
        const canDelete = comment.user.toString() === userId.toString() ||
            post.author.toString() === userId.toString();

        if (!canDelete) {
            throw new Error('Not authorized to delete this comment');
        }

        // Remove the comment
        post.comments.pull(commentId);
        await post.save();

        // Return populated post in a single query
        return { _id: post._id };

    } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
    }
};

// Share/Unshare post
const toggleShare = async (postId, userId) => {
    const post = await Post.findById(postId);
    if (!post) {
        throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
    }

    const shareIndex = post.shares.findIndex(share => share.user.toString() === userId.toString());
    let isShared = false;

    if (shareIndex > -1) {
        // Unshare the post
        post.shares.splice(shareIndex, 1);
        isShared = false;
    } else {
        // Share the post
        post.shares.push({ user: userId });
        isShared = true;

        // Send notification for new share (only if not sharing own post)
        if (post.author.toString() !== userId.toString()) {
            const notificationService = require('./notificationService');
            // Non-blocking notification
            notificationService.sendPostNotification(
                postId,
                userId,
                post.author.toString(),
                'share'
            ).catch(err => console.error('Share notification error:', err));
        }
    }

    await post.save();
    const updatedPost = await Post.findById(post._id)
        .populate(getPostPopulationConfig());

    return { post: updatedPost, isShared };
};

// Search posts by content or tags
const searchPosts = async (query, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const words = query.trim().split(/\s+/);
    return await Post.find({
        isPublic: true,
        $or: [
            ...words.map(word => ({ content: { $regex: word, $options: 'i' } })),
            ...words.map(word => ({ tags: { $in: [new RegExp(word, 'i')] } }))
        ]
    })
        .populate(getPostPopulationConfig())
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
        .populate(getPostPopulationConfig())
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

const uploadMedia = async (postId, mediaFiles) => {
    const post = await Post.findById(postId);
    if (!post) {
        throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
    }

    // Validate max media
    const totalMedia = (post.media?.length || 0) + mediaFiles.length;
    if (totalMedia > 10) {
        throw new Error('--Cannot upload more than 10 media files per post');
    }

    for (const file of mediaFiles) {
        const isVideo = file.mimetype.startsWith('video/');
        const resourceType = isVideo ? 'video' : 'image';

        // Optimized upload configuration
        const uploadConfig = {
            resource_type: resourceType,
            // Auto quality optimization
            quality: 'auto',
            // Enable additional optimizations
            flags: 'any_format',
            // Eager transformations (pre-generated formats)
            eager: isVideo ? [
                { format: 'mp4', quality: 'auto:best', video_codec: 'h264' },
                { format: 'webm', quality: 'auto:best', video_codec: 'vp9' },
                { format: 'jpg', quality: 'auto:best', resource_type: 'image' } // video thumbnail
            ] : [
                { quality: 'auto:best', flags: 'any_format' },
                { format: 'webp', quality: 'auto:best' },
                { format: 'avif', quality: 'auto:best' },
                { width: 400, height: 400, crop: 'limit', quality: 'auto:best' },
                { width: 800, height: 800, crop: 'limit', quality: 'auto:best' },
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto:best' }
            ],
            // Optimize for web delivery
            fetch_format: 'auto',
            progressive: true,
            strip_transformations: true,
            cache_control: 'max-age=31536000', // 1 year
            backup: true,
            folder: `posts/${postId}`,
            public_id: `${postId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            overwrite: true,
            type: 'upload',
            tags: ['post_media', postId, resourceType],
            notification_url: process.env.CLOUDINARY_WEBHOOK_URL,
            context: {
                alt: `Media for post ${postId}`,
                caption: `Uploaded at ${new Date().toISOString()}`
            }
        };

        // Additional video-specific optimizations
        if (isVideo) {
            uploadConfig.video_codec = 'h264';
            uploadConfig.audio_codec = 'aac';
            uploadConfig.eager_async = true;
        }

        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                uploadConfig,
                function (error, result) {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
            fs.createReadStream(file.path).pipe(stream);
        });

        if (!post.media) post.media = [];

        const mediaInfo = {
            secure_url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            eager: result.eager?.map(eager => ({
                secure_url: eager.secure_url,
                width: eager.width,
                height: eager.height,
                format: eager.format,
                bytes: eager.bytes
            })) || [],
            responsive_urls: isVideo ? {
                mp4: result.eager?.find(e => e.format === 'mp4')?.secure_url,
                webm: result.eager?.find(e => e.format === 'webm')?.secure_url,
                poster: result.eager?.find(e => e.resource_type === 'image')?.secure_url
            } : {
                original: result.secure_url,
                small: result.eager?.find(e => e.width === 400)?.secure_url,
                medium: result.eager?.find(e => e.width === 800)?.secure_url,
                large: result.eager?.find(e => e.width === 1200)?.secure_url,
                webp: result.eager?.find(e => e.format === 'webp')?.secure_url,
                avif: result.eager?.find(e => e.format === 'avif')?.secure_url
            },
            uploaded_at: new Date().toISOString()
        };

        post.media.push(mediaInfo);

        // Clean up local file
        fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting local file:', err);
        });
    }

    await post.save();
    return await getPopulatedPost(post._id);
};


// Delete media from Cloudinary by public_id
const deleteMediaFromCloudinary = async (publicId, resourceType = 'image') => {
    try {
        console.log(`Deleting from Cloudinary - Public ID: ${publicId}, Resource Type: ${resourceType}`);

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true // Invalidate CDN cache
        });

        console.log(`Cloudinary deletion result for ${publicId}:`, result);

        // Cloudinary returns { result: 'ok' } for successful deletions
        // or { result: 'not found' } if the resource doesn't exist
        return result;
    } catch (error) {
        console.error(`Error deleting ${publicId} from Cloudinary:`, error);
        throw error;
    }
};

//helper functions for upcoming service____________
const extractPublicIdFromUrl = (url) => {
    try {
        // Handle different Cloudinary URL formats
        // Format 1: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
        // Format 2: https://res.cloudinary.com/cloud_name/image/upload/folder/filename.jpg
        // Format 3: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/filename.jpg
        // Format 4: https://res.cloudinary.com/cloud_name/image/upload/filename.jpg

        // First, remove the base URL and get the path after '/upload/'
        const uploadMatch = url.match(/\/upload\/(.+)$/);
        if (!uploadMatch) {
            throw new Error('Invalid Cloudinary URL format');
        }

        let pathAfterUpload = uploadMatch[1];

        // Remove version number if present (starts with 'v' followed by digits)
        pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

        // Remove file extension
        const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');

        console.log(`Extracted public_id: ${publicId} from URL: ${url}`);
        return publicId;
    } catch (error) {
        console.error('Error extracting public_id from URL:', error);
        return null;
    }
};

// Function to detect resource type from URL
const detectResourceTypeFromUrl = (url) => {
    if (url.includes('/video/upload/')) {
        return 'video';
    } else if (url.includes('/image/upload/')) {
        return 'image';
    } else if (url.includes('/raw/upload/')) {
        return 'raw';
    }
    // Default to image if can't detect
    return 'image';
};

//________________________________
const deleteMediaFromCloudinaryByUrl = async (url, resourceType = null) => {
    try {
        const publicId = extractPublicIdFromUrl(url);

        if (!publicId) {
            throw new Error(`Could not extract public_id from URL: ${url}`);
        }

        // Auto-detect resource type if not provided
        if (!resourceType) {
            resourceType = detectResourceTypeFromUrl(url);
        }

        return await deleteMediaFromCloudinary(publicId, resourceType);
    } catch (error) {
        console.error(`Error deleting media by URL ${url}:`, error);
        throw error;
    }
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
    toggleShare,
    searchPosts,
    getPostsByTag,
    checkPostOwnership,
    uploadMedia,
    deleteMediaFromCloudinary,
    deleteMediaFromCloudinaryByUrl,
    addCommentReply,
    deleteCommentReply
};
