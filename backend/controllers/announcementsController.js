const pool = require('../config/db');
const { createNotification } = require('./notificationController');

// Add Announcement
const addAnnouncement = async (req, res) => {
  const createdBy = req.user.id;
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ 
      success: false, 
      message: 'Title and description are required' 
    });
  }

  try {
    const target_role = (req.user.role === 'teacher') ? 'my_class' : 'all';

    const { rows } = await pool.query(
      `INSERT INTO announcements (title, description, created_by, target_role, date)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
       RETURNING id, title, description, target_role, date`,
      [title, description, createdBy, target_role]
    );

    const newAnnouncement = rows[0];

    // ================== NOTIFICATION LOGIC ==================
    try {
      if (req.user.role === 'teacher') {
        // Notify all students in this teacher's class
        const studentsRes = await pool.query(
          "SELECT id FROM users WHERE teacher_id = $1 AND role = 'student'",
          [createdBy]
        );

        for (const student of studentsRes.rows) {
          await createNotification(
            student.id, 
            "New Announcement", 
            title, 
            'announcement'
          );
        }
      } 
      else if (req.user.role === 'admin') {
        // Notify all students and teachers
        const allUsersRes = await pool.query(
          "SELECT id FROM users WHERE role IN ('student', 'teacher')"
        );

        for (const u of allUsersRes.rows) {
          await createNotification(
            u.id, 
            "New Announcement from Admin", 
            title, 
            'announcement'
          );
        }
      }
    } catch (notifError) {
      console.error("Failed to create notifications:", notifError);
      // Don't fail the announcement creation if notification fails
    }
    // =======================================================

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement: newAnnouncement
    });
  } catch (error) {
    console.error('Add Announcement Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create announcement' 
    });
  }
};

// Get Announcements
const getAnnouncements = async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;

  try {
    let query = `
      SELECT 
        a.id, 
        a.title, 
        a.description, 
        a.target_role, 
        a.date, 
        u.name as created_by_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
    `;

    let params = [];

    if (userRole === 'student') {
      query += `
        WHERE a.target_role = 'all' 
           OR (a.target_role = 'my_class' AND a.created_by IN (
             SELECT teacher_id FROM users WHERE id = $1
           ))
      `;
      params = [userId];
    } else if (userRole === 'teacher') {
      query += `
        WHERE a.target_role = 'all'
           OR (a.target_role = 'my_class' AND a.created_by = $1)
      `;
      params = [userId];
    }
    // Admin sees all

    query += ` ORDER BY a.date DESC LIMIT 30`;

    const { rows } = await pool.query(query, params);
    
    res.json({ 
      success: true, 
      announcements: rows 
    });
  } catch (error) {
    console.error('Get Announcements Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Delete Announcement
const deleteAnnouncement = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let query = 'DELETE FROM announcements WHERE id = $1';
    let params = [id];

    if (userRole === 'teacher') {
      query += ' AND created_by = $2';
      params.push(userId);
    }

    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Announcement not found or not authorized' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Announcement deleted successfully' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete announcement' 
    });
  }
};

module.exports = {
  addAnnouncement,
  getAnnouncements,
  deleteAnnouncement
};