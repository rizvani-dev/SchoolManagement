const express = require('express');
const router = express.Router();

// Import Controllers
const { createUser, getAllUsers, updateUser, deleteUser } = require('../controllers/adminController');

// Import Middleware
const authenticateToken = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

// Protect all admin routes
router.use(authenticateToken);           // Verify JWT
router.use(checkRole(['admin']));        // Only allow admin role

// Admin Routes
router.post('/users', createUser);           // Create student or teacher
router.get('/users', getAllUsers);           // List users (?role=student or teacher)
router.put('/users/:id', updateUser);        // Update user
router.delete('/users/:id', deleteUser);     // Delete user

module.exports = router;