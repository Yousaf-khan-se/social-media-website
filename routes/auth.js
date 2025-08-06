const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);

//routes for resetting password if forgot by user
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', authenticateToken, authController.getProfile);
router.delete('/account', authenticateToken, authController.deleteAccount);
router.post('/logout', authenticateToken, authController.logout);
router.post('/change-password', authenticateToken, authController.changePassword);

// Admin routes (you might want to add admin authentication middleware here)
router.post('/admin/cleanup-deleted-users', authenticateToken, authController.cleanupDeletedUsers);

module.exports = router;
