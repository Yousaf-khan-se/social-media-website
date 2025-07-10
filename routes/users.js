const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');


router.put('/profile', authenticateToken, userController.updateAuthenticatedUserProfile);

module.exports = router;