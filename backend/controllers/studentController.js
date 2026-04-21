const pool = require('../config/db');

// Get Student Dashboard - Only own data
const getDashboard = async (req, res) => {
  const studentId = req.user.id;

  try {
    // Get student basic info + class name
    const studentQuery = await pool.query(`
      SELECT u.id, u.name, u.email, u.class_id, u.bio, u.profile_image,
             c.name as class_name
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.id = $1 AND u.role = 'student'
    `, [studentId]);

    if (studentQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = studentQuery.rows[0];

    // Get Attendance Record (last 30 days)
    const attendanceQuery = await pool.query(`
      SELECT date, status 
      FROM attendance 
      WHERE student_id = $1 
      ORDER BY date DESC 
      LIMIT 30
    `, [studentId]);

    // Get Results
    const resultsQuery = await pool.query(`
      SELECT subject, marks, created_at 
      FROM results 
      WHERE student_id = $1 
      ORDER BY created_at DESC
    `, [studentId]);

    // Get Announcements for students
    const announcementsQuery = await pool.query(`
      SELECT title, description, date 
      FROM announcements 
      WHERE target_role IN ('all', 'student') 
      ORDER BY date DESC 
      LIMIT 10
    `);

    res.json({
      success: true,
      dashboard: {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          class_name: student.class_name || "Not Assigned",
          bio: student.bio,
          profile_image: student.profile_image
        },
        attendance: attendanceQuery.rows,
        results: resultsQuery.rows,
        announcements: announcementsQuery.rows
      }
    });
  } catch (error) {
    console.error("Student Dashboard Error:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error loading dashboard' 
    });
  }
};

// Get Own Attendance Only
const getMyAttendance = async (req, res) => {
  const studentId = req.user.id;

  try {
    const { rows } = await pool.query(`
      SELECT a.date, a.status, c.name as class_name
      FROM attendance a
      LEFT JOIN classes c ON a.class_id = c.id
      WHERE a.student_id = $1 
      ORDER BY a.date DESC
    `, [studentId]);

    res.json({ success: true, attendance: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Own Results Only
const getMyResults = async (req, res) => {
  const studentId = req.user.id;

  try {
    const { rows } = await pool.query(`
      SELECT subject, marks, created_at 
      FROM results 
      WHERE student_id = $1 
      ORDER BY created_at DESC
    `, [studentId]);

    res.json({ success: true, results: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getDashboard,
  getMyAttendance,
  getMyResults
};