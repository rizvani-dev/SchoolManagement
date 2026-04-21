const express = require('express');
const router = express.Router();
const multer = require('multer');

// Multer setup for profile image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profile/');   // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for profile images
});

// Import Controller
const { 
  getMyStudents, 
  addStudent, 
  updateStudent, 
  deleteStudent, 
  updateProfile 
} = require('../controllers/teacherController');

// Import Middleware
const authenticateToken = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

// Protect all teacher routes
router.use(authenticateToken);
router.use(checkRole(['teacher']));

// Teacher Routes
router.get('/students', getMyStudents);                    // Get students in my class
router.post('/students', addStudent);                      // Add student to my class
router.put('/students/:id', updateStudent);                // Update student
router.delete('/students/:id', deleteStudent);             // Delete student

// Profile update with image upload
router.put('/profile', upload.single('profile_image'), updateProfile);

module.exports = router;