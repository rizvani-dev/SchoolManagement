const express = require('express');
const router = express.Router();
const multer = require('multer');
const { sendMessage, getMessages } = require('../controllers/studentChatController');
const authenticateToken = require('../middleware/authMiddleware');

// ====================== MULTER CONFIG ======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/chat/');   // Same folder as teacher
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|mp4|webm|ogg/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDF, and video files are allowed!'));
    }
  }
});

// ====================== STUDENT CHAT ROUTES ======================
router.post('/', authenticateToken, upload.single('file'), sendMessage);
router.get('/', authenticateToken, getMessages);

module.exports = router;