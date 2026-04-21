const pool = require('../config/db');
const { createNotification } = require('./notificationController');

// Student sends message (text + file) to their teacher
const sendMessage = async (req, res) => {
  const studentId = req.user.id;
  const { message } = req.body;
  const file = req.file;

  try {
    // Get student's assigned teacher
    const teacherRes = await pool.query(
      "SELECT teacher_id FROM users WHERE id = $1 AND role = 'student'",
      [studentId]
    );

    if (teacherRes.rows.length === 0 || !teacherRes.rows[0].teacher_id) {
      return res.status(400).json({ 
        success: false, 
        message: "You are not assigned to any teacher. Please contact Admin." 
      });
    }

    const teacherId = teacherRes.rows[0].teacher_id;

    let fileUrl = null;
    let fileName = null;

    if (file) {
      fileUrl = `/uploads/chat/${file.filename}`;
      fileName = file.originalname;
    }

    const { rows } = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message, file_url, file_name, status)
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [studentId, teacherId, message || '', fileUrl, fileName, 'sent']
    );

    // Notify the teacher
    await createNotification(
      teacherId,
      "New Message from Student",
      message ? message.substring(0, 80) + (message.length > 80 ? "..." : "") : "Sent a file",
      'chat'
    );

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      chat: rows[0]
    });
  } catch (error) {
    console.error("Student Send Message Error:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

// Get student's chat history with their teacher
const getMessages = async (req, res) => {
  const studentId = req.user.id;

  try {
    const teacherRes = await pool.query(
      "SELECT teacher_id FROM users WHERE id = $1 AND role = 'student'",
      [studentId]
    );

    if (teacherRes.rows.length === 0 || !teacherRes.rows[0].teacher_id) {
      return res.status(400).json({ 
        success: false, 
        message: "You are not assigned to any teacher." 
      });
    }

    const teacherId = teacherRes.rows[0].teacher_id;

    const { rows } = await pool.query(
      `SELECT m.*, u.name as sender_name 
       FROM messages m 
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [studentId, teacherId]
    );

    res.json({ success: true, messages: rows });
  } catch (error) {
    console.error("Student Get Messages Error:", error);
    res.status(500).json({ success: false, message: "Failed to load chat" });
  }
};

module.exports = { 
  sendMessage, 
  getMessages 
};