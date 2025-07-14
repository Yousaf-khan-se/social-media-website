const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticateToken } = require('../middleware/auth');

// All post routes require authentication
router.use(authenticateToken);

// Post CRUD operations
router.post('/', postController.createPost);                  // Create post
router.get('/my-posts', postController.getMyPosts);           // Get current user's posts
router.get('/feed', postController.getFeed);                  // Get feed (following users' posts)
router.get('/explore', postController.getExplore);            // Get public posts (explore)
router.get('/search', postController.searchPosts);            // Search posts
router.get('/user/:userId', postController.getUserPosts);     // Get specific user's posts
router.get('/:postId', postController.getPost);               // Get specific post
router.put('/:postId', postController.updatePost);            // Update post
router.delete('/:postId', postController.deletePost);         // Delete post
router.put('/media/:postId', postController.addMediaToPost);   // Upload images

// Post interactions
router.post('/:postId/like', postController.toggleLike);      // Like/Unlike post
router.post('/:postId/comments', postController.addComment);  // Add comment
router.delete('/:postId/comments/:commentId', postController.deleteComment); // Delete comment

module.exports = router;
