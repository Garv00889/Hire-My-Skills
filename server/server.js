const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dns = require('dns');
require('dotenv').config();

// Fix Windows DNS resolution for MongoDB Atlas SRV
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if custom DNS fails
}

const connectDB = require('./config/db');
const initSocket = require('./socket/socketHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize socket handlers
initSocket(io);

// CORS configuration (allow all local dev origins & OPTIONS preflight)
app.use(cors({
  origin: true, // Reflects the request origin, dynamically allowing http://localhost:5173, 127.0.0.1, etc.
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/', (req, res) => {
  res.json({ message: '🚀 HireMySkills API is running!' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Server Error' });
});

const Application = require('./models/Application');
const Notification = require('./models/Notification');

// Periodic background cleanup of expired declined applications (> 7 days)
const runCleanupJob = async () => {
  try {
    const expiredApps = await Application.find({
      status: 'temporarily_declined',
      expiresAt: { $lte: new Date() }
    });
    if (expiredApps.length > 0) {
      const expiredIds = expiredApps.map(a => a._id);
      await Notification.deleteMany({ relatedApplication: { $in: expiredIds } });
      await Application.deleteMany({ _id: { $in: expiredIds } });
      console.log(`🧹 Cleaned up ${expiredIds.length} expired declined applications.`);
    }
  } catch (e) {
    // Ignore cleanup errors
  }
};

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  // Run cleanup on startup and every 60 minutes
  runCleanupJob();
  setInterval(runCleanupJob, 60 * 60 * 1000);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

};

startServer();
