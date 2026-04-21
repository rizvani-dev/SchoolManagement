const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
  uploadAttendance,
  getAllAttendance,
  editAttendance,
  getAttendanceSummary,
  exportAttendance
} = require('../controllers/attendanceController');

const authenticateToken = require('../middleware/authMiddleware');
const checkRole = require('../middleware/roleMiddleware');

const upload = multer({ dest: 'uploads/attendance/' });

router.post('/upload', authenticateToken, checkRole(['admin','teacher']), upload.single('file'), uploadAttendance);

router.get('/', authenticateToken, getAllAttendance);

router.get('/summary', authenticateToken, checkRole(['student']), getAttendanceSummary);

router.get('/export', authenticateToken, exportAttendance);

router.put('/:id', authenticateToken, checkRole(['admin','teacher']), editAttendance);

module.exports = router;