const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dns = require('dns');
require('dotenv').config();

// Global Crash Guards: Prevent unexpected uncaught errors or unhandled rejections from crashing the process
process.on('uncaughtException', (err) => {
  console.error('💥 [CRASH GUARD] Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [CRASH GUARD] Unhandled Promise Rejection:', reason);
});

// Fix Windows DNS resolution for MongoDB Atlas SRV
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if custom DNS fails
}

const connectDB = require('./config/db');
const initSocket = require('./socket/socketHandler');
const passport = require('./config/passport');

// Route imports
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const githubRoutes = require('./routes/githubRoutes');

const app = express();
const server = http.createServer(app);

// Trust proxy for Render reverse proxy (SSL, headers, IPs)
app.set('trust proxy', 1);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: true, // Dynamically allows http://localhost:5173, 127.0.0.1, other ports
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

// Capture rawBody for GitHub Webhook HMAC SHA-256 signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf ? buf.toString() : '';
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Health check
app.get('/', (req, res) => {
  res.json({ message: '🚀 HireMySkills API is running!' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // OAuth redirect compatibility alias
app.use('/api/projects', projectRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/github', githubRoutes);

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

const User = require('./models/User');

// Automatically ensure default SuperAdmin account exists in any connected MongoDB
const ensureSuperAdmin = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@hiremyskills.com').toLowerCase().trim();
    const adminPass = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'Super Administrator',
        email: adminEmail,
        password: adminPass,
        role: 'superadmin',
        status: 'active',
        isVerified: true,
        tagline: 'Lead System Architect & Admin',
        location: 'Mumbai, India',
        contactNumber: '+91 99999 88888',
        adminPermissions: {
          canManageUsers: true,
          canManageProjects: true,
          canManageFinance: true,
          canManageTickets: true,
          canManageSettings: true,
          canManageAnnouncements: true,
        },
      });
      console.log(`👑 [SUPERADMIN] Created default SuperAdmin: ${adminEmail}`);
    } else {
      let changed = false;
      if (admin.role !== 'superadmin') {
        admin.role = 'superadmin';
        changed = true;
      }
      if (admin.status !== 'active') {
        admin.status = 'active';
        changed = true;
      }
      if (!admin.isVerified) {
        admin.isVerified = true;
        changed = true;
      }
      if (changed) {
        await admin.save();
        console.log(`👑 [SUPERADMIN] Verified SuperAdmin permissions: ${adminEmail}`);
      }
    }
  } catch (err) {
    console.error('SuperAdmin seed check notice:', err.message);
  }
};

const PORT = process.env.PORT || 5000;
let listenAttempts = 0;
const MAX_LISTEN_ATTEMPTS = 3;

/**
 * Free any lingering zombie process on port (especially on Windows during rapid nodemon restarts)
 */
const killProcessOnPort = (port) => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      const { exec } = require('child_process');
      exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, () => resolve());
      return;
    }
    const { exec } = require('child_process');
    exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
      if (err || !stdout) return resolve();
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== String(process.pid)) {
          pids.add(pid);
        }
      });
      if (pids.size === 0) return resolve();
      let done = 0;
      pids.forEach((pid) => {
        exec(`taskkill /F /PID ${pid}`, () => {
          done++;
          if (done === pids.size) resolve();
        });
      });
    });
  });
};

server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    listenAttempts++;
    console.warn(`⚠️ [PORT OCCUPIED] Port ${PORT} is busy (attempt ${listenAttempts}/${MAX_LISTEN_ATTEMPTS}). Freeing port...`);
    if (listenAttempts <= MAX_LISTEN_ATTEMPTS) {
      await killProcessOnPort(PORT);
      setTimeout(() => {
        try {
          server.close();
        } catch (_) {}
        server.listen(PORT, () => {
          console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
      }, 1000);
    } else {
      console.error(`❌ Port ${PORT} remains occupied after ${MAX_LISTEN_ATTEMPTS} attempts. Please free port ${PORT} manually.`);
    }
  } else {
    console.error('❌ Server error:', err.message);
  }
});

// Graceful shutdown handling for nodemon and process signals
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Closing server gracefully...`);
  try {
    server.close(() => {
      const mongoose = require('mongoose');
      mongoose.connection.close(false).then(() => {
        process.exit(0);
      }).catch(() => process.exit(0));
    });
  } catch (_) {
    process.exit(0);
  }
  setTimeout(() => process.exit(0), 2000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGUSR2', () => {
  try {
    server.close(() => {
      process.kill(process.pid, 'SIGUSR2');
    });
  } catch (_) {
    process.kill(process.pid, 'SIGUSR2');
  }
});

const startServer = async () => {
  try {
    await connectDB();
    await ensureSuperAdmin();
    // Run cleanup on startup and every 60 minutes
    runCleanupJob();
    setInterval(runCleanupJob, 60 * 60 * 1000);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server startup error:', err.message);
  }
};

startServer().catch((err) => {
  console.error('❌ Fatal error during server boot:', err.message);
});
