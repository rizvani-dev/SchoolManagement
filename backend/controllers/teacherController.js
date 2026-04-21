const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Get My Students
const getMyStudents = async (req, res) => {
  const teacherId = req.user.id;

  try {
    const { rows } = await pool.query(`
      SELECT id, name, email, class_id, bio, profile_image, last_seen 
      FROM users 
      WHERE role = 'student' 
        AND teacher_id = $1
      ORDER BY name
    `, [teacherId]);

    res.json({ success: true, students: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add Student
const addStudent = async (req, res) => {
  const teacherId = req.user.id;
  const { name, email, password, bio } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email and password are required" });
  }

  try {
    // Check if teacher has class
    const teacherCheck = await pool.query(
      'SELECT class_id FROM users WHERE id = $1 AND role = $2',
      [teacherId, 'teacher']
    );

    const classId = teacherCheck.rows[0]?.class_id;

    if (!classId) {
      return res.status(400).json({ 
        success: false, 
        message: "Teacher is not assigned to any class. Please ask Admin to assign a class." 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, class_id, teacher_id, bio)
       VALUES ($1, $2, $3, 'student', $4, $5, $6) 
       RETURNING id, name, email, class_id, bio, profile_image`,
      [name, email, hashedPassword, classId, teacherId, bio || null]
    );

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      student: rows[0]
    });
  } catch (error) {
    console.error("Add Student Error:", error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error while adding student' 
    });
  }
};

// Update Student (basic)
const updateStudent = async (req, res) => {
  const teacherId = req.user.id;
  const { id } = req.params;
  const { name, email, bio } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2, bio = $3 
       WHERE id = $4 AND teacher_id = $5 AND role = 'student'
       RETURNING *`,
      [name, email, bio, id, teacherId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found or not in your class" });
    }

    res.json({ success: true, message: "Student updated", student: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update student" });
  }
};

// Delete Student
const deleteStudent = async (req, res) => {
  const teacherId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM users 
       WHERE id = $1 AND teacher_id = $2 AND role = 'student'`,
      [id, teacherId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Student not found or not in your class" });
    }

    res.json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete student" });
  }
};

// Update Teacher Profile (with image support)
const updateProfile = async (req, res) => {
  const teacherId = req.user.id;
  const { bio } = req.body;
  const file = req.file;

  try {
    let profileImageUrl = null;
    if (file) {
      profileImageUrl = `/uploads/profile/${file.filename}`;
    }

    const { rows } = await pool.query(
      `UPDATE users 
       SET bio = $1, 
           profile_image = COALESCE($2, profile_image)
       WHERE id = $3 AND role = 'teacher'
       RETURNING id, name, email, bio, profile_image`,
      [bio, profileImageUrl, teacherId]
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      profile: rows[0]
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

module.exports = {
  getMyStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  updateProfile
};