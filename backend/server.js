const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./config/db');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');



dotenv.config();

const app = express();
const server = http.createServer(app);

// ====================== MIDDLEWARE ======================
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));           // Increased limit for files
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ====================== STATIC FILE SERVING (CRITICAL FIX) ======================

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();

    // Correct Content-Type
    if (ext === '.pdf') res.setHeader('Content-Type', 'application/pdf');
    else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext))
      res.setHeader('Content-Type', `image/${ext === '.jpg' ? 'jpeg' : ext.slice(1)}`);
    else if (['.mp4', '.webm', '.ogg'].includes(ext))
      res.setHeader('Content-Type', `video/${ext.slice(1)}`);

    // Allow preview for images/videos, force download for PDF/others
    if (ext === '.pdf' || !['.jpg','.jpeg','.png','.gif','.webp','.mp4','.webm','.ogg'].includes(ext)) {
      res.setHeader('Content-Disposition', 'attachment');
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

// ====================== SOCKET.IO SETUP ======================
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);

  socket.on("join", async (userId) => {
    if (!userId) return;

    socket.userId = userId;
    socket.join(`user_${userId}`);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    try {
      await pool.query("UPDATE users SET online = true WHERE id = $1", [userId]);
    } catch (err) {
      console.error("Online update error:", err.message);
    }

    io.emit("userStatusUpdate", { userId, online: true });
    console.log(`✅ User ${userId} is ONLINE`);
  });

  socket.on("typing", ({ senderId, receiverId }) => {
    if (receiverId) socket.to(`user_${receiverId}`).emit("typing", { senderId });
  });

  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    if (!receiverId || !message) return;

    try {
      const result = await pool.query(
        `INSERT INTO messages (sender_id, receiver_id, message, status)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [senderId, receiverId, message, "sent"]
      );

      const messageData = result.rows[0];
      io.to(`user_${receiverId}`).emit("receiveMessage", messageData);
      socket.emit("receiveMessage", messageData);
    } catch (err) {
      console.error("Message send error:", err.message);
    }
  });

  socket.on("markSeen", async ({ senderId, receiverId }) => {
    try {
      await pool.query(
        `UPDATE messages SET status = 'seen' 
         WHERE sender_id = $1 AND receiver_id = $2 AND status != 'seen'`,
        [senderId, receiverId]
      );
      io.to(`user_${senderId}`).emit("messagesSeen", { receiverId });
    } catch (err) {
      console.error("Seen update error:", err.message);
    }
  });

  socket.on("disconnect", async () => {
    const userId = socket.userId;
    if (!userId) return;

    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        const lastSeen = new Date();

        try {
          await pool.query(
            "UPDATE users SET online = false, last_seen = $1 WHERE id = $2",
            [lastSeen, userId]
          );
        } catch (err) {
          console.error("Last seen error:", err.message);
        }

        io.emit("userStatusUpdate", {
          userId,
          online: false,
          last_seen: lastSeen
        });

        console.log(`❌ User ${userId} OFFLINE`);
      }
    }
  });
});

// ====================== ROUTES ======================
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const resultsRoutes = require('./routes/resultsRoutes');
const announcementsRoutes = require('./routes/announcementsRoutes');
const chatRoutes = require('./routes/chatRoutes');
const studentChatRoutes = require('./routes/studentChatRoutes');
const teacherNotificationRoutes = require('./routes/teacherNotificationRoutes');
const studentNotificationRoutes = require('./routes/studentNotificationRoutes');


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/teacher/chat', chatRoutes);
app.use('/api/student/chat', studentChatRoutes);
app.use('/api/teacher/notifications', teacherNotificationRoutes);
app.use('/api/student/notifications', studentNotificationRoutes);


// Health Check
app.get('/', (req, res) => {
  res.json({ 
    status: '✅ School Management Backend FULLY READY',
    message: 'Socket.io + Real-time Chat + File Upload Fixed'
  });
});

// 404 & Error Handler
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Auto Cleanup
setInterval(async () => {
  try {
    await pool.query(`
      DELETE FROM announcements 
      WHERE created_by IN (SELECT id FROM users WHERE role = 'teacher') 
      AND date < NOW() - INTERVAL '7 days'
    `);

    await pool.query(`
      DELETE FROM notifications 
      WHERE created_at < NOW() - INTERVAL '7 days'
    `);
  } catch (e) {
    console.error("Auto delete error:", e);
  }
}, 24 * 60 * 60 * 1000);

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 School Management Backend running on http://localhost:${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL Connected Successfully');
  } catch (e) {
    console.error('❌ Database connection failed');
  }
});