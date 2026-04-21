const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Helper function to check if email already exists
const userExists = async (email) => {
  const { rows } = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  return rows.length > 0;
};

// Create User (Student or Teacher) - Admin Only
const createUser = async (req, res) => {
  const { name, email, password, role, class_id, bio, profile_image } = req.body;

  // Validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ 
      success: false, 
      message: 'Name, email, password and role are required' 
    });
  }

  if (!['student', 'teacher'].includes(role)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Role must be student or teacher' 
    });
  }

  if (role === 'teacher' && !class_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Class ID is required for teachers' 
    });
  }

  try {
    // Check if email already exists
    if (await userExists(email)) {
      return res.status(409).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role, class_id, bio, profile_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, name, email, role, class_id, bio, profile_image`,
      [name, email, hashedPassword, role, class_id || null, bio || null, profile_image || null]
    );

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
      user: rows[0]
    });

  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while creating user' 
    });
  }
};

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, class_id, bio, profile_image, created_at FROM users ORDER BY role, name'
    );
    res.json({ success: true, users: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update User
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, class_id, bio, profile_image } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2, role = $3, class_id = $4, bio = $5, profile_image = $6
       WHERE id = $7 
       RETURNING id, name, email, role, class_id, bio, profile_image`,
      [name, email, role, class_id || null, bio || null, profile_image || null, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      user: rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete User
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  updateUser,
  deleteUser
};