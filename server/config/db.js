const mongoose = require('mongoose');

const connectDB = async () => {
  // Option 1: Try MongoDB Atlas / primary MONGO_URI
  if (process.env.MONGO_URI) {
    try {
      console.log('🔄 Connecting to MongoDB Atlas...');
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`🚀 MongoDB Atlas Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.warn(`⚠️ Primary MongoDB Atlas connection failed (${error.message}). Attempting fallback...`);
    }
  }

  // Option 2: Try Local MongoDB
  try {
    console.log('🔄 Trying Local MongoDB (127.0.0.1:27017)...');
    const conn = await mongoose.connect('mongodb://127.0.0.1:27017/hiremyskills', {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`🚀 Local MongoDB Connected: ${conn.connection.host}`);
    return;
  } catch (localErr) {
    console.warn('⚠️ Local MongoDB not available. Launching In-Memory MongoDB Server...');
  }

  // Option 3: Fallback to MongoMemoryServer
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    const conn = await mongoose.connect(mongoUri);
    console.log(`🚀 In-Memory MongoDB Started & Connected: ${conn.connection.host}`);
  } catch (memErr) {
    console.error(`❌ Critical: All MongoDB connection methods failed: ${memErr.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
