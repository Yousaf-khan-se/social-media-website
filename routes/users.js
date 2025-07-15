const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');


router.put('/profile', authenticateToken, userController.updateAuthenticatedUserProfile);
// router.put('/peoplerecommendations', authenticateToken, userController.updatePeopleRecommendations);
router.get('/search', authenticateToken, userController.searchUsers);


module.exports = router;