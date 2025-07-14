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

// Create a new post
const createPost = async (postData) => {
    const post = new Post(postData);
    await post.save();
    return await post
        .populate('author', 'username firstName lastName profilePicture')
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture');
};

// Get post by ID
const getPostById = async (postId) => {
    return await Post.findById(postId)
        .populate('author', 'username firstName lastName profilePicture')
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture');
};

// Get posts by user ID
const getPostsByUserId = async (userId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    return await Post.find({ author: userId, isPublic: true })
        .populate('author', 'username firstName lastName profilePicture')
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture')
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
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Get public posts (explore/discover feed)
const getPublicPosts = async (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    return await Post.find({ isPublic: true })
        .populate('author', 'username firstName lastName profilePicture')
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture')
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
        .populate('author', 'username firstName lastName profilePicture')
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture');
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
    return await Post.findById(post._id)
        .populate('author', 'username firstName lastName profilePicture')
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture');
};

// Add comment to post
const addComment = async (postId, commentData) => {
    const post = await Post.findById(postId);
    if (!post) {
        throw new Error(ERROR_MESSAGES.POST_NOT_FOUND || 'Post not found');
    }

    post.comments.push(commentData);
    await post.save();

    // Fully populate all user references
    await post
        .populate('author', 'username firstName lastName profilePicture')
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture');
    return post;
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

    // Fully populate all user references
    await post
        .populate('author', 'username firstName lastName profilePicture')
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture');
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
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture')
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
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture')
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
    // Fully populate all user references
    await post
        .populate('author', 'username firstName lastName profilePicture')
        .populate('comments.user', 'username firstName lastName profilePicture')
        .populate('likes.user', 'username firstName lastName profilePicture')
        .populate('shares.user', 'username firstName lastName profilePicture');
    return post;
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
    searchPosts,
    getPostsByTag,
    checkPostOwnership,
    uploadMedia,
    deleteMediaFromCloudinary,
    deleteMediaFromCloudinaryByUrl,
};
