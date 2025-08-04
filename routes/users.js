const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Static routes first
router.get('/suggested', authenticateToken, userController.getSuggestedUsers);
router.put('/profile', authenticateToken, userController.updateAuthenticatedUserProfile);
// router.put('/peoplerecommendations', authenticateToken, userController.updatePeopleRecommendations);
router.get('/search', authenticateToken, userController.searchUsers);
router.get('/followers', authenticateToken, userController.getUserFollowers);
router.get('/followings', authenticateToken, userController.getUserFollowing);
router.post('/profile-picture', authenticateToken, userController.upload.single('profilePicture'), userController.uploadProfilePicture);

// Dynamic routes last
router.get('/:userId', authenticateToken, userController.getUserProfile);
router.post('/:followId/follow', authenticateToken, userController.addAuthenticatedUserFollowers);
router.delete('/:followId/follow', authenticateToken, userController.removeAuthenticatedUserFollowers);

module.exports = router;