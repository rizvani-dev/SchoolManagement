const pool = require('../config/db');

// Get Notifications
const getNotifications = async (req, res) => {
  const userId = req.user.id;

  try {
    const { rows } = await pool.query(
      `SELECT id, title, message, type, is_read, created_at 
       FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 30`,
      [userId]
    );

    res.json({ 
      success: true, 
      notifications: rows 
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ success: false, message: "Failed to load notifications" });
  }
};

// Mark as Read
const markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const { rowCount } = await pool.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, message: "Marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update" });
  }
};

// Helper to create notification (call from other controllers)
const createNotification = async (userId, title, message, type = 'info') => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [userId, title, message, type]
    );
  } catch (error) {
    console.error("Create Notification Error:", error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  createNotification
};