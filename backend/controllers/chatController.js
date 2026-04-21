const pool = require('../config/db');
const { createNotification } = require('./notificationController');

// Teacher sends message (text + file) to specific student
const sendMessage = async (req, res) => {
  const teacherId = req.user.id;
  const { studentId } = req.params;
  const { message } = req.body;
  const file = req.file;

  if (!studentId) {
    return res.status(400).json({ success: false, message: "Student ID is required" });
  }

  try {
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
      [teacherId, studentId, message || '', fileUrl, fileName, 'sent']
    );

    // Notify the student
    await createNotification(
      studentId,
      "New Message from Teacher",
      message ? message.substring(0, 80) + (message.length > 80 ? "..." : "") : "Sent a file",
      'chat'
    );

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      chat: rows[0]
    });
  } catch (error) {
    console.error("Teacher Send Message Error:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

// Get chat history between teacher and student
const getMessages = async (req, res) => {
  const teacherId = req.user.id;
  const { studentId } = req.params;

  if (!studentId) {
    return res.status(400).json({ success: false, message: "Student ID is required" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT m.*, u.name as sender_name 
       FROM messages m 
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [teacherId, studentId]
    );

    res.json({ success: true, messages: rows });
  } catch (error) {
    console.error("Teacher Get Messages Error:", error);
    res.status(500).json({ success: false, message: "Failed to load messages" });
  }
};

module.exports = { 
  sendMessage, 
  getMessages 
};