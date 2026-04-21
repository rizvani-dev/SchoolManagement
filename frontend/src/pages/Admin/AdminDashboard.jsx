import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import API from '../../api/axiosInstance';
import StatCard from '../../components/Dashboard/StatCard';
import UserTable from '../../components/Tables/UserTable';
import AnnouncementForm from '../../components/Announcements/AnnouncementForm';
import AnnouncementList from '../../components/Announcements/AnnouncementList';
import { FaUsers, FaChalkboardTeacher, FaUserGraduate, FaBullhorn, FaSignOutAlt, FaImage, FaUser } from 'react-icons/fa';
import './adminPanel.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();

  const emptyForm = {
    name: '',
    email: '',
    password: '',
    role: 'student',
    class_id: '',
    bio: '',
    profile_image: ''
  };

  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, totalClasses: 5 });
  const [users, setUsers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [imagePreview, setImagePreview] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const usersRes = await API.get('/admin/users');
      const allUsers = usersRes.data.users || usersRes.data || [];
      setUsers(allUsers);

      const annRes = await API.get('/announcements');
      setAnnouncements(annRes.data.announcements || annRes.data || []);

      const students = allUsers.filter(u => u.role === 'student').length;
      const teachers = allUsers.filter(u => u.role === 'teacher').length;

      setStats({
        totalStudents: students,
        totalTeachers: teachers,
        totalClasses: 5
      });
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Image Upload (with size limit)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast.error("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setFormData({ ...formData, profile_image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();

    if (formData.role === 'teacher' && !formData.class_id) {
      toast.error("Class ID is required for Teachers");
      return;
    }

    try {
      if (editingUser) {
        await API.put(`/admin/users/${editingUser.id}`, formData);
        toast.success('User updated successfully');
      } else {
        await API.post('/admin/users', formData);
        toast.success(`${formData.role === 'teacher' ? 'Teacher' : 'Student'} created successfully!`);
      }

      // Reset form
      setShowUserForm(false);
      setEditingUser(null);
      setFormData(emptyForm);
      setImagePreview(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'student',
      class_id: user.class_id || '',
      bio: user.bio || '',
      profile_image: user.profile_image || ''
    });
    setImagePreview(user.profile_image || null);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await API.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      fetchData();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await API.delete(`/announcements/${id}`);
      toast.success('Announcement deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  return (
    <div className="admin-container">
      {/* Navbar */}
      <nav className="admin-navbar">
        <div className="admin-navbar-content">
          <div className="flex items-center gap-4">
            <div className="admin-logo">A</div>
            <div>
              <h1 className="admin-title">Admin Panel</h1>
              <p className="admin-subtitle">School Management System</p>
            </div>
          </div>

          <div className="admin-user-info">
            <div className="text-right">
              <p className="admin-username">{user?.name}</p>
              <p className="admin-role">Administrator</p>
            </div>
            <button onClick={logout} className="logout-btn">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="admin-main">
        {/* Stats */}
        <div className="stats-grid">
          <StatCard title="Total Students" value={stats.totalStudents} icon={FaUserGraduate} color="blue" />
          <StatCard title="Total Teachers" value={stats.totalTeachers} icon={FaChalkboardTeacher} color="green" />
          <StatCard title="Total Classes" value={stats.totalClasses} icon={FaUsers} color="purple" />
          <StatCard title="Announcements" value={announcements.length} icon={FaBullhorn} color="orange" />
        </div>

        {/* Users Management */}
        <div className="user-management-card">
          <UserTable
            users={users}
            onEdit={handleEdit}
            onDelete={handleDeleteUser}
            onAddUser={() => {
              setEditingUser(null);
              setFormData(emptyForm);
              setImagePreview(null);
              setShowUserForm(true);
            }}
            loading={loading}
          />
        </div>

        {/* Announcements Section */}
        <div className="announcements-section">
          <h2 className="section-title">
            <FaBullhorn /> Announcements
          </h2>

          <AnnouncementForm onSuccess={fetchData} />

          <AnnouncementList 
            announcements={announcements} 
            onDelete={handleDeleteAnnouncement}
            canDelete={true}
          />
        </div>
      </div>

      {/* User Create/Edit Modal with Profile Image */}
      {showUserForm && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-body">
              <h2 className="modal-title">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>

              <form onSubmit={handleUserSubmit} className="user-form">
                {/* Profile Image Upload */}
                <div className="image-upload-area">
                  <div className="preview-container">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="preview-image" />
                    ) : (
                      <div className="no-image">
                        <FaUser size={40} />
                        <p>No Image</p>
                      </div>
                    )}
                  </div>
                  <label className="upload-label">
                    Choose Profile Image (Max 2MB)
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      className="hidden" 
                    />
                  </label>
                </div>

                <input 
                  placeholder="Full Name *" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="form-input" 
                  required 
                />

                <input 
                  type="email" 
                  placeholder="Email *" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="form-input" 
                  required 
                />

                {!editingUser && (
                  <input 
                    type="password" 
                    placeholder="Password *" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    className="form-input" 
                    required 
                  />
                )}

                <select 
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value})} 
                  className="form-input"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>

                <input 
                  type="number" 
                  placeholder="Class ID (1-5)" 
                  value={formData.class_id} 
                  onChange={e => setFormData({...formData, class_id: e.target.value})} 
                  className="form-input" 
                />

                <textarea 
                  placeholder="Bio (Optional)" 
                  value={formData.bio} 
                  onChange={e => setFormData({...formData, bio: e.target.value})} 
                  className="form-textarea" 
                />

                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={() => setShowUserForm(false)} 
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;