import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import API from '../../api/axiosInstance';
import { 
  FaUser, FaSignOutAlt, FaBullhorn, FaComments, FaBell, 
  FaPaperclip, FaDownload, FaTimes, 
  FaWindowClose,
  FaPaperPlane,
  FaChartBar,
  FaChartPie,
  FaChartArea
} from 'react-icons/fa';
import io from 'socket.io-client';
import './studentPanel.css';
import AttendanceSection from '../../components/Attendance/AttendanceSection';

const socket = io("http://localhost:5000", { withCredentials: true });

const StudentDashboard = () => {
  const { user, logout } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);   // For image preview before send
  const [showChatModal, setShowChatModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  const chatMessagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  // Socket.io
  useEffect(() => {
    if (!user?.id) return;
    socket.emit("join", user.id);

    socket.on("receiveMessage", (data) => {
      if (dashboardData?.teacher?.id && 
          (data.sender_id === dashboardData.teacher.id || data.senderId === dashboardData.teacher.id)) {
        setChatMessages(prev => [...prev, data]);
      }
    });

    socket.on("typing", ({ senderId }) => {
      if (dashboardData?.teacher?.id && senderId === dashboardData.teacher.id) {
        setIsTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
      }
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("typing");
    };
  }, [user?.id, dashboardData?.teacher?.id]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await API.get('/student/dashboard');
      setDashboardData(res.data.dashboard);

      const annRes = await API.get('/announcements');
      setAnnouncements(annRes.data.announcements || []);
    } catch (error) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/student/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChat = async () => {
    try {
      const res = await API.get('/student/chat');
      setChatMessages(res.data.messages || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Fixed Send Message Logic
  const sendMessage = async () => {
    // Only show warning if BOTH message and file are empty
    if (!newMessage.trim() && !selectedFile) {
      toast.warning("Please type a message or select a file");
      return;
    }

    const formData = new FormData();
    formData.append('message', newMessage || '');
    if (selectedFile) formData.append('file', selectedFile);

    try {
      await API.post('/student/chat', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Reset form
      setNewMessage("");
      setSelectedFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      fetchChat();
      toast.success("Message sent successfully");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to send message");
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
    setFilePreview(URL.createObjectURL(file));   // Show preview for images
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (dashboardData?.teacher?.id) {
      socket.emit("typing", { senderId: user.id, receiverId: dashboardData.teacher.id });
    }
  };

  // Lightbox
  const openLightbox = (imageUrl) => {
    setLightboxImage(`http://localhost:5000${imageUrl}`);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const markAsRead = async (id) => {
    try {
      await API.put(`/student/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setShowNotifications(false);

    if (notif.type === 'chat') {
      setShowChatModal(true);
      fetchChat();
    } else if (notif.type === 'announcement') {
      document.getElementById('announcements-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return <div className="student-container"><div className="loading-text">Loading your dashboard...</div></div>;
  }

  const { student, attendance, results, teacher } = dashboardData || {};

  return (
    <div className="student-container">
      {/* Navbar */}
      <nav className="student-navbar">
        <div className="student-navbar-content">
          <div className="flex items-center gap-4">
            <div className="student-avatar">
              {student?.profile_image ? (
                <img src={student.profile_image} alt={student.name} />
              ) : (
                <div className="avatar-placeholder">👨‍🎓</div>
              )}
            </div>
            <div>
              <h1 className="student-title">Student Portal</h1>
              <p className="student-welcome-text">Welcome back, {student?.name}</p>
            </div>
          </div>

          <div className="student-right">
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
            {notifications.length === 0 ? (
              <p className="no-notif">No new notifications</p>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <strong>{notif.title}</strong>
                  <p>{notif.message}</p>
                  <small>{new Date(notif.created_at).toLocaleString()}</small>
                </div>
              ))
            )}
          </div>
        )}
      </nav>

      <div className="student-main">
       
        {/* Welcome Card */}
        <div className="student-welcome-card">
          <div className="student-avatar-large">
            {student?.profile_image ? <img src={student.profile_image} alt={student.name} /> : <div className="avatar-placeholder-large">👨‍🎓</div>}
          </div>
          <h2 className="welcome-text">Hello, {student?.name} 👋</h2>
          <p className="class-info">Class: <strong>{student?.class_name || "Not Assigned"}</strong></p>
        </div>

        {/* Profile Info */}
        <div className="info-card">
          <h3><FaUser className="inline mr-2" /> Your Profile</h3>
          <div className="profile-grid">
            <div><p className="label">Email</p><p className="value">{student?.email}</p></div>
            <div><p className="label">Student ID</p><p className="value">#{student?.id}</p></div>
            <div><p className="label">Class</p><p className="value">{student?.class_name || "Not Assigned"}</p></div>
          </div>
          {student?.bio && <div className="bio-section"><p className="label">Bio</p><p className="bio-text">{student.bio}</p></div>}
        </div>

        {/* Message Teacher Button */}
        <div className="chat-section">
          <button 
            className="chat-btn-fixed"
            onClick={() => { 
              setShowChatModal(true); 
              fetchChat(); 
            }}
          >
            <FaComments /> Message Your Teacher
          </button>
        </div>

       {/* Attendance, Results, Announcements */}
        <div className="info-card">
          <h3><FaChartArea/>Recent Attendance</h3>
          <AttendanceSection />
        
        </div>

        <div className="info-card">
          <h3><FaChartBar/>Your Results</h3>
          {results && results.length > 0 ? (
            <table className="student-table">
              <thead><tr><th>Subject</th><th>Marks</th><th>Date</th></tr></thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.subject}</td>
                    <td><strong>{r.marks}</strong>/100</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="empty-state">No results available yet.</p>}
        </div>

        <div id="announcements-section" className="info-card">
          <h3><FaBullhorn className="inline mr-2" /> Announcements</h3>
          {announcements.length > 0 ? (
            <div className="announcements-list">
              {announcements.map(ann => (
                <div key={ann.id} className="announcement-card">
                  <h4 className="announcement-title">{ann.title}</h4>
                  <p className="announcement-description">{ann.description}</p>
                  <div className="announcement-meta">
                    <span>By: <strong>{ann.created_by_name || 'Admin'}</strong></span>
                    <span className="announcement-date">
                      {new Date(ann.date).toLocaleString('en-US', {
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="empty-state">No announcements at the moment.</p>}
        </div>
      </div>


      {/* Chat Modal */}
      {showChatModal && (
        <div className="modal-overlay">
          <div className="chat-modal">
            <div className="chat-header">
              <div className="chat-user-info">
                <div className="chat-avatar">
                  {teacher?.profile_image ? <img src={teacher.profile_image} alt={teacher.name} /> : <div className="avatar-placeholder">👨‍🏫</div>}
                </div>
                <div>
                  <h3>{teacher?.name || "Your Teacher"}</h3>
                  <div className="status-info">
                    <span className={`status-dot ${teacher?.online ? 'online' : 'offline'}`}></span>
                    <span>{teacher?.online ? ' Online' : 'Offline'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowChatModal(false)} className="close-btn"><FaWindowClose/></button>
            </div>

            <div className="chat-messages" ref={chatMessagesRef}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`message ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
                  {msg.file_url && (
                    <div className="file-message">
                      {msg.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img 
                          src={`http://localhost:5000${msg.file_url}`} 
                          alt={msg.file_name || "Image"} 
                          className="chat-image"
                          onClick={() => openLightbox(msg.file_url)}
                          style={{ cursor: 'pointer' }}
                        />
                      ) : msg.file_url.match(/\.(mp4|webm|ogg)$/i) ? (
                        <video controls className="chat-video">
                          <source src={`http://localhost:5000${msg.file_url}`} />
                        </video>
                      ) : (
                        <div className="file-attachment">
                          📎 {msg.file_name || "File"}
                        </div>
                      )}

                      <a 
                        href={`http://localhost:5000${msg.file_url}`} 
                        download={msg.file_name || true}
                        className="download-btn"
                      >
                        <FaDownload /> Download
                      </a>
                    </div>
                  )}

                  {msg.message && <p>{msg.message}</p>}
                  <small>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
              ))}

              {isTyping && <div className="typing-indicator">Teacher is typing...</div>}
            </div>

            {/* Chat Input Area with Selected File Name */}
            <div className="chat-input-area">
              {/* Selected File Display */}
              {selectedFile && (
                <div className="selected-file-info">
                  <span>📎 {selectedFile.name}</span>
                  <button onClick={removeSelectedFile} className="remove-file-btn">
                    <FaTimes />
                  </button>
                </div>
              )}

              <label className="attach-btn">
                <FaPaperclip />
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept="image/*,application/pdf,video/*"
                />
              </label>

              <input
                value={newMessage}
                onChange={handleTyping}
                placeholder="Type a message or attach file..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />

              <button onClick={sendMessage} className="send-btn"><FaPaperPlane/></button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={closeLightbox}>
              <FaTimes />
            </button>
            <img src={lightboxImage} alt="Preview" className="lightbox-image" />
            <a 
              href={lightboxImage} 
              download 
              className="lightbox-download-btn"
            >
              <FaDownload /> Download Image
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;