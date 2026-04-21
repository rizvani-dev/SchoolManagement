// backend/routes/studentNotificationRoutes.js

const express = require('express');
const router = express.Router();

// Correct import - NO .default
const { getNotifications, markAsRead } = require('../controllers/notificationController');

const authenticateToken = require('../middleware/authMiddleware');

// All routes are protected with JWT
router.use(authenticateToken);

// Get all notifications for the logged-in student
router.get('/', getNotifications);

// Mark a specific notification as read
router.put('/:id/read', markAsRead);

module.exports = router;