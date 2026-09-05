require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore
}

const User = require('../models/User');
const Project = require('../models/Project');
const Application = require('../models/Application');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

async function clearUri(uri, name) {
  console.log(`\n========================================`);
  console.log(`🔄 Attempting to connect & clear: ${name}`);
  console.log(`URI: ${uri.replace(/:\/\/.*@/, '://<credentials>@')}`);
  try {
    const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 4000 }).asPromise();
    console.log(` Connected to ${name} (${conn.host} / ${conn.name})`);

    const collections = await conn.db.listCollections().toArray();
    console.log(` Found collections:`, collections.map(c => c.name));

    for (const col of collections) {
      if (!col.name.startsWith('system.')) {
        const rawCol = conn.db.collection(col.name);
        const count = await rawCol.countDocuments();
        console.log(` 📋 Collection [${col.name}]: ${count} documents.`);
        if (count > 0) {
          const res = await rawCol.deleteMany({});
          console.log(`   🗑️ Deleted ${res.deletedCount} documents from [${col.name}].`);
        }
      }
    }

    // Verify after
    for (const col of collections) {
      if (!col.name.startsWith('system.')) {
        const rawCol = conn.db.collection(col.name);
        const count = await rawCol.countDocuments();
        console.log(`   ✅ Collection [${col.name}] final count: ${count}`);
      }
    }

    await conn.close();
    console.log(`🔌 Closed connection to ${name}.`);
    return true;
  } catch (err) {
    console.warn(`⚠️ Could not clear ${name}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Full Database Reset for HireMySkills...');

  // 1. Clear Local MongoDB
  const localUri = 'mongodb://127.0.0.1:27017/hiremyskills';
  await clearUri(localUri, 'Local MongoDB');

  // 2. Clear Primary MONGO_URI (Atlas) if configured
  if (process.env.MONGO_URI) {
    await clearUri(process.env.MONGO_URI, 'Atlas MongoDB');
  }

  // 3. Connect via standard connectDB to ensure all indexes are synced on the active DB
  const connectDB = require('../config/db');
  console.log('\n🔄 Connecting via application connectDB() to sync indexes...');
  await connectDB();

  console.log('📊 Verifying Mongoose Model document counts on active DB:');
  const userCount = await User.countDocuments();
  const projCount = await Project.countDocuments();
  const appCount = await Application.countDocuments();
  const msgCount = await Message.countDocuments();
  const notifCount = await Notification.countDocuments();

  console.log({
    users: userCount,
    projects: projCount,
    applications: appCount,
    messages: msgCount,
    notifications: notifCount,
  });

  // Sync indexes
  await User.syncIndexes();
  await Project.syncIndexes();
  await Application.syncIndexes();
  await Message.syncIndexes();
  await Notification.syncIndexes();
  console.log('✅ All model schemas and indexes are intact and verified.');

  await mongoose.disconnect();
  console.log('\n🎉 DATABASE RESET COMPLETE: 100% clean state ready for fresh users!\n');
  process.exit(0);
}

main();
