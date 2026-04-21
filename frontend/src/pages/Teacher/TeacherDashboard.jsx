import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { 
  FaUserGraduate, FaPlus, FaSignOutAlt, FaBullhorn, FaUser, 
  FaComments, FaBell, FaPaperclip, FaDownload, FaTimes, FaFileExcel, FaEdit 
} from "react-icons/fa";
import AnnouncementForm from "../../components/Announcements/AnnouncementForm";
import AnnouncementList from "../../components/Announcements/AnnouncementList";
import io from "socket.io-client";
import "./teacherpanel.css";

const socket = io("http://localhost:5000", { withCredentials: true });

const TeacherDashboard = () => {
  const { user, logout } = useAuth();

  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // Chat States
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  // Attendance States
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [allAttendance, setAllAttendance] = useState([]);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  const chatMessagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const excelInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Socket
  useEffect(() => {
    if (!user?.id) return;
    socket.emit("join", user.id);

    socket.on("receiveMessage", (data) => {
      if (selectedStudent && (data.sender_id === selectedStudent.id || data.senderId === selectedStudent.id)) {
        setChatMessages(prev => [...prev, data]);
      }
    });

    socket.on("typing", ({ senderId }) => {
      if (selectedStudent && senderId === selectedStudent.id) {
        setIsTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
      }
    });

    socket.on("userStatusUpdate", (data) => {
      setStudents(prev => prev.map(s => 
        s.id === data.userId ? { ...s, online: data.online } : s
      ));
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("typing");
      socket.off("userStatusUpdate");
    };
  }, [selectedStudent, user?.id]);

  const fetchStudents = async () => {
    try {
      const res = await API.get("/teacher/students");
      setStudents(res.data.students || res.data || []);
    } catch (err) {
      toast.error("Failed to load students");
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await API.get("/announcements");
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      toast.error("Failed to load announcements");
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/teacher/notifications");
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChat = async (studentId) => {
    try {
      const res = await API.get(`/teacher/chat/${studentId}`);
      setChatMessages(res.data.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllAttendance = async () => {
    try {
      const res = await API.get('/attendance');
      setAllAttendance(res.data.attendance || []);
    } catch (err) {
      console.error(err);
    }
  };
  
  const exportAllAttendance = () => {
  window.open('http://localhost:5000/api/attendance/export');
};
  //HandleNotification 
  const handleNotificationClick = (notif) => {
  setShowNotifications(false);

  if (notif.type === "chat") {
    const student = students.find(s => s.id === notif.related_user_id);
    if (student) {
      setSelectedStudent(student);
      fetchChat(student.id);
    }
  }
};

  // Edit Attendance
  const handleEditAttendance = async () => {
    if (!editingAttendance) return;

    try {
      await API.put(`/attendance/${editingAttendance.id}`, {
        status: editStatus,
        remarks: editRemarks
      });
      toast.success("Attendance updated successfully");
      setEditingAttendance(null);
      fetchAllAttendance();
    } catch (err) {
      toast.error("Failed to update attendance");
    }
  };

  // Excel Upload
  const handleExcelUpload = async () => {
    if (!excelFile) {
      toast.error("Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append('file', excelFile);

    try {
      const res = await API.post('/attendance/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || "Attendance uploaded successfully!");
      setShowAttendanceModal(false);
      setExcelFile(null);
      if (excelInputRef.current) excelInputRef.current.value = '';
      fetchAllAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload attendance");
    }
  };

  // Send Message
  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedStudent) return;

    const formData = new FormData();
    formData.append("message", newMessage || "");
    if (selectedFile) formData.append("file", selectedFile);

    try {
      await API.post(`/teacher/chat/${selectedStudent.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setNewMessage("");
      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      fetchChat(selectedStudent.id);
      toast.success("Message sent");
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (selectedStudent) {
      socket.emit("typing", { senderId: user.id, receiverId: selectedStudent.id });
    }
  };

  const openLightbox = (imageUrl) => setLightboxImage(`http://localhost:5000${imageUrl}`);
  const closeLightbox = () => setLightboxImage(null);

  // Add Student Handlers
  const emptyStudentForm = { name: "", email: "", password: "", bio: "", profile_image: "" };
  const [studentFormData, setStudentFormData] = useState(emptyStudentForm);
  const [studentImagePreview, setStudentImagePreview] = useState(null);

  const handleStudentImageChange = (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setStudentImagePreview(reader.result);
      setStudentFormData({ ...studentFormData, profile_image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await API.post("/teacher/students", studentFormData);
      toast.success("Student created successfully!");
      setShowAddStudentModal(false);
      setStudentFormData(emptyStudentForm);
      setStudentImagePreview(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add student");
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAnnouncements();
    fetchNotifications();
    fetchAllAttendance();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="teacher-container">
      {/* Navbar */}
      <div className="teacher-navbar">
        <div className="teacher-navbar-content">
          <div className="flex items-center gap-3">
            <FaUserGraduate className="teacher-logo" />
            <h1 className="teacher-title">Teacher Dashboard</h1>
          </div>

          <div className="teacher-user">
            <div className="teacher-profile">
              {user?.profile_image ? <img src={user.profile_image} alt="Teacher" className="teacher-avatar" /> : <div className="teacher-avatar-placeholder"><FaUser /></div>}
            </div>
            <span className="teacher-username">{user?.name}</span>

            <div className="notification-bell" onClick={() => setShowNotifications(!showNotifications)}>
              <FaBell />
              {unreadCount > 0 && <span className="notification-dot">{unreadCount}</span>}
            </div>

            <button onClick={logout} className="logout-btn">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>

        {showNotifications && (
          <div className="notification-dropdown">
            <h4>Notifications</h4>
            {notifications.length === 0 ? <p>No new notifications</p> : 
              notifications.map(notif => (
                <div key={notif.id} className="notification-item" onClick={() => handleNotificationClick(notif)}>
                  <strong>{notif.title}</strong>
                  <p>{notif.message}</p>
                </div>
              ))
            }
          </div>
        )}
      </div>

      <div className="teacher-content">
        <div id="announcements-section" className="announcement-section">
          <h2 className="section-title"><FaBullhorn /> Announcements</h2>
          <AnnouncementForm onSuccess={fetchAnnouncements} />
          <AnnouncementList announcements={announcements} canDelete={false} />
        </div>

        {/* Attendance Management */}
        <div className="attendance-upload-section">
          <h2 className="section-title"><FaFileExcel /> Attendance Management</h2>
          <button className="btn-primary attendance-btn" onClick={() => setShowAttendanceModal(true)}>
            <FaFileExcel /> Upload / Edit Attendance
          </button>
          <button className="btn-primary" onClick={exportAllAttendance}>
  Export Full Attendance
</button>
        </div>

        {/* Students Grid */}
        <div className="teacher-header">
          <h2>Your Students ({students.length})</h2>
          <button className="btn-primary" onClick={() => setShowAddStudentModal(true)}>
            <FaPlus /> Add New Student
          </button>
        </div>

        <div className="student-grid">
          {students.map(s => (
            <div key={s.id} className="student-card">
              <div className="student-avatar">
                {s.profile_image ? <img src={s.profile_image} alt={s.name} /> : <div className="avatar-placeholder">👨‍🎓</div>}
              </div>
              <p className="st-id">ID: {s.id}</p>
              <h3>{s.name}</h3>
              <p>{s.email}</p>
              <div className="student-status">
                <span className={`status-dot ${s.online ? 'online' : 'offline'}`}></span>
                <span>{s.online ? 'Online' : 'Offline'}</span>
              </div>
              <button className="chat-btn" onClick={() => { setSelectedStudent(s); fetchChat(s.id); }}>
                <FaComments /> Inbox
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3 className="modal-title">Add New Student</h3>
            <form onSubmit={handleAddStudent} className="form">
              <div className="image-upload-area">
                <div className="preview-container">
                  {studentImagePreview ? <img src={studentImagePreview} alt="Preview" className="preview-image" /> : <div className="no-image"><FaUser size={40} /><p>Upload Photo</p></div>}
                </div>
                <label className="upload-label">
                  Choose Profile Image (Max 2MB)
                  <input type="file" accept="image/*" onChange={handleStudentImageChange} className="hidden" />
                </label>
              </div>

              <input placeholder="Full Name *" value={studentFormData.name} onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })} required />
              <input type="email" placeholder="Email Address *" value={studentFormData.email} onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })} required />
              <input type="password" placeholder="Password *" value={studentFormData.password} onChange={(e) => setStudentFormData({ ...studentFormData, password: e.target.value })} required />
              <input placeholder="Bio / Notes (Optional)" value={studentFormData.bio} onChange={(e) => setStudentFormData({ ...studentFormData, bio: e.target.value })} />

              <div className="form-actions">
                <button type="button" onClick={() => setShowAddStudentModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="modal-overlay">
          <div className="modal-box large">
            <h3>Attendance Management</h3>
            <button onClick={() => setShowAttendanceModal(false)} className="close-btn">×</button>

            {/* Bulk Upload */}
            <div className="bulk-section">
              <h4>Upload Excel Sheet</h4>
              <input type="file" ref={excelInputRef} accept=".xlsx,.xls" onChange={(e) => setExcelFile(e.target.files[0])} />
              <button onClick={handleExcelUpload} className="btn-primary" disabled={!excelFile}>
                Upload Excel
              </button>
            </div>

            {/* Edit Attendance */}
            <div className="edit-section">
              <h4>Edit Previous Attendance</h4>
              <table className="attendance-edit-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allAttendance.map((att) => (
                    <tr key={att.id}>
                      <td>{att.student_name}</td>
                      <td>{new Date(att.date).toLocaleDateString()}</td>
                      <td>{att.status}</td>
                      <td>{att.remarks || '-'}</td>
                      <td>
                        <button onClick={() => {
                          setEditingAttendance(att);
                          setEditStatus(att.status);
                          setEditRemarks(att.remarks || '');
                        }} className="edit-btn">
                          <FaEdit />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendance Modal */}
      {editingAttendance && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Edit Attendance</h3>
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </select>
            <input placeholder="Remarks (Optional)" value={editRemarks} onChange={(e) => setEditRemarks(e.target.value)} />
            <div className="form-actions">
              <button onClick={() => setEditingAttendance(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleEditAttendance} className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {selectedStudent && (
        <div className="modal-overlay">
          <div className="chat-modal">
            <div className="chat-header">
              <div className="chat-user-info">
                <div className="chat-avatar">
                  {selectedStudent.profile_image ? <img src={selectedStudent.profile_image} alt={selectedStudent.name} /> : <div className="avatar-placeholder">👨‍🎓</div>}
                </div>
                <div>
                  <h3>{selectedStudent.name}</h3>
                  <div className="status-info">
                    <span className={`status-dot ${selectedStudent.online ? 'online' : 'offline'}`}></span>
                    <span>{selectedStudent.online ? '🟢 Online' : 'Offline'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="close-btn">×</button>
            </div>

            <div className="chat-messages" ref={chatMessagesRef}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
                  {msg.file_url && (
                    <div className="file-message">
                      {msg.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={`http://localhost:5000${msg.file_url}`} alt={msg.file_name || "Image"} className="chat-image" onClick={() => openLightbox(msg.file_url)} style={{ cursor: 'pointer' }} />
                      ) : msg.file_url.match(/\.(mp4|webm|ogg)$/i) ? (
                        <video controls className="chat-video"><source src={`http://localhost:5000${msg.file_url}`} /></video>
                      ) : (
                        <div className="file-attachment">📎 {msg.file_name || "File"}</div>
                      )}
                      <a href={`http://localhost:5000${msg.file_url}`} download={msg.file_name || true} className="download-btn">
                        <FaDownload /> Download
                      </a>
                    </div>
                  )}
                  {msg.message && <p>{msg.message}</p>}
                  <small>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
              ))}
              {isTyping && <div className="typing-indicator">{selectedStudent.name} is typing...</div>}
            </div>

            <div className="chat-input-area">
              <label className="attach-btn">
                <FaPaperclip />
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*,application/pdf,video/*" />
              </label>
              <input value={newMessage} onChange={handleTyping} placeholder="Type reply or attach file..." onKeyPress={(e) => e.key === 'Enter' && sendMessage()} />
              <button onClick={sendMessage} className="send-btn">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox}><FaTimes /></button>
            <img src={lightboxImage} alt="Preview" className="lightbox-image" />
            <a href={lightboxImage} download className="lightbox-download-btn"><FaDownload /> Download Image</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;