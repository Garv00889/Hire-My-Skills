const mongoose = require('mongoose');

const connectDB = async (retries = 3, delay = 2000) => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined in .env');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) {
        throw error;
      }
      console.log(`Retrying MongoDB connection in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
};

module.exports = connectDB;

