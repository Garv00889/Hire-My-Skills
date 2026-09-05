require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const connectDB = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Application = require('../models/Application');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

async function auditDatabase() {
  try {
    await connectDB();

    console.log('\n======================================================');
    console.log('🔍 DATABASE AUDIT REPORT (READ-ONLY)');
    console.log('======================================================\n');

    // 1. Collections & Counts
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('--- 1. COLLECTIONS FOUND ---');
    const collectionSummary = [];
    for (const c of collections) {
      const count = await mongoose.connection.db.collection(c.name).countDocuments();
      collectionSummary.push({ name: c.name, count });
      console.log(`- Collection: ${c.name} | Total Records: ${count}`);
    }

    // 2. Users Audit
    console.log('\n--- 2. USERS AUDIT ---');
    const users = await User.find({}).lean();
    console.log(`Total Users in DB: ${users.length}`);
    users.forEach((u, i) => {
      console.log(`[User #${i + 1}] ID: ${u._id}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Has Password Hash: ${!!u.password} (Length: ${u.password ? u.password.length : 0})`);
      console.log(`  Contact Number: ${u.contactNumber || 'None'}`);
      console.log(`  Tagline: ${u.tagline || 'None'}`);
      console.log(`  Location: ${u.location || 'None'}`);
      console.log(`  Skills: ${u.skills ? u.skills.join(', ') : 'None'}`);
      console.log(`  Portfolio Projects Count: ${u.portfolioProjects ? u.portfolioProjects.length : 0}`);
      console.log(`  Experience Entries Count: ${u.experience ? u.experience.length : 0}`);
      console.log(`  Certifications Count: ${u.certifications ? u.certifications.length : 0}`);
      console.log(`  Education Count: ${u.education ? u.education.length : 0}`);
      console.log(`  Google ID: ${u.googleId ? 'Present' : 'None'}`);
      console.log(`  GitHub ID: ${u.githubId ? 'Present' : 'None'}`);
      console.log(`  Created At: ${u.createdAt}`);
    });

    // 3. Projects Audit
    console.log('\n--- 3. PROJECTS AUDIT ---');
    const projects = await Project.find({}).populate('creator', 'name email').populate('members', 'name email').lean();
    console.log(`Total Projects in DB: ${projects.length}`);
    let totalProjectMembersCount = 0;
    projects.forEach((p, i) => {
      totalProjectMembersCount += (p.members?.length || 0);
      console.log(`[Project #${i + 1}] ID: ${p._id}`);
      console.log(`  Title: ${p.title}`);
      console.log(`  Category: ${p.category} | Level: ${p.level} | Status: ${p.status}`);
      console.log(`  Required Members Cap: ${p.membersRequired}`);
      console.log(`  Owner / Creator: ${p.creator ? `${p.creator.name} (${p.creator.email} / ID: ${p.creator._id})` : 'ORPHANED CREATOR ID: ' + p.creator}`);
      console.log(`  Members (${p.members?.length || 0}):`);
      (p.members || []).forEach((m, mi) => {
        console.log(`    - Member ${mi + 1}: ${m ? `${m.name} (${m.email} / ID: ${m._id})` : 'ORPHANED MEMBER ID'}`);
      });
      console.log(`  GitHub Repo: ${p.githubRepo || 'None'}`);
      console.log(`  Design File: ${p.designFile || 'None'}`);
      console.log(`  Created At: ${p.createdAt}`);
    });

    // 4. Applications Audit
    console.log('\n--- 4. APPLICATIONS AUDIT ---');
    const applications = await Application.find({}).populate('applicant', 'name email').populate('project', 'title').lean();
    console.log(`Total Applications in DB: ${applications.length}`);
    applications.forEach((a, i) => {
      console.log(`[Application #${i + 1}] ID: ${a._id}`);
      console.log(`  Project: ${a.project ? `${a.project.title} (${a.project._id})` : 'ORPHANED PROJECT ID: ' + a.project}`);
      console.log(`  Applicant: ${a.applicant ? `${a.applicant.name} (${a.applicant.email} / ID: ${a.applicant._id})` : 'ORPHANED APPLICANT ID: ' + a.applicant}`);
      console.log(`  Status: ${a.status}`);
      console.log(`  Message: "${a.message}"`);
      console.log(`  Declined At: ${a.declinedAt || 'N/A'} | Expires At: ${a.expiresAt || 'N/A'}`);
      console.log(`  Created At: ${a.createdAt}`);
    });

    // 5. Messages Audit
    console.log('\n--- 5. MESSAGES AUDIT ---');
    const messages = await Message.find({}).populate('sender', 'name email').populate('project', 'title').lean();
    console.log(`Total Messages in DB: ${messages.length}`);
    let fileMessagesCount = 0;
    messages.forEach((m, i) => {
      if (m.isFile || m.fileUrl) fileMessagesCount++;
      console.log(`[Message #${i + 1}] ID: ${m._id}`);
      console.log(`  Project: ${m.project ? `${m.project.title} (${m.project._id})` : 'ORPHANED PROJECT ID: ' + m.project}`);
      console.log(`  Sender: ${m.sender ? `${m.sender.name} (${m.sender.email} / ID: ${m.sender._id})` : 'ORPHANED SENDER ID: ' + m.sender}`);
      console.log(`  Content: "${m.content}"`);
      console.log(`  Is File: ${m.isFile} | File URL: ${m.fileUrl || 'None'} | File Name: ${m.fileName || 'None'} | File Type: ${m.fileType || 'None'}`);
      console.log(`  Created At: ${m.createdAt}`);
    });

    // 6. Notifications Audit
    console.log('\n--- 6. NOTIFICATIONS AUDIT ---');
    const notifications = await Notification.find({}).populate('recipient', 'name email').populate('sender', 'name email').populate('relatedProject', 'title').lean();
    console.log(`Total Notifications in DB: ${notifications.length}`);
    notifications.forEach((n, i) => {
      console.log(`[Notification #${i + 1}] ID: ${n._id}`);
      console.log(`  Type: ${n.type}`);
      console.log(`  Recipient: ${n.recipient ? `${n.recipient.name} (${n.recipient.email} / ID: ${n.recipient._id})` : 'ORPHANED RECIPIENT ID: ' + n.recipient}`);
      console.log(`  Sender: ${n.sender ? `${n.sender.name} (${n.sender.email} / ID: ${n.sender._id})` : 'None/System'}`);
      console.log(`  Message: "${n.message}"`);
      console.log(`  Is Read: ${n.isRead}`);
      console.log(`  Related Project: ${n.relatedProject ? `${n.relatedProject.title} (${n.relatedProject._id})` : 'None'}`);
      console.log(`  Related Application ID: ${n.relatedApplication || 'None'}`);
      console.log(`  Created At: ${n.createdAt}`);
    });

    // 7. Filesystem Uploads Audit
    console.log('\n--- 7. FILESYSTEM UPLOADS AUDIT ---');
    const uploadsDir = path.resolve(__dirname, '../uploads');
    let localFiles = [];
    if (fs.existsSync(uploadsDir)) {
      localFiles = fs.readdirSync(uploadsDir);
    }
    console.log(`Local Uploads Directory: ${uploadsDir}`);
    console.log(`Total Local Files: ${localFiles.length}`);
    localFiles.forEach((f, i) => {
      console.log(`  - File ${i + 1}: ${f}`);
    });

    // 8. Integrity & Orphan Check
    console.log('\n--- 8. INTEGRITY & ORPHAN CHECK ---');
    const userIds = new Set(users.map(u => u._id.toString()));
    const projectIds = new Set(projects.map(p => p._id.toString()));

    let orphanCount = 0;

    // Check project creators & members
    for (const p of projects) {
      const cId = (p.creator?._id || p.creator)?.toString();
      if (!userIds.has(cId)) {
        console.warn(`⚠️ Project ${p._id} has non-existent creator: ${cId}`);
        orphanCount++;
      }
      for (const m of (p.members || [])) {
        const mId = (m?._id || m)?.toString();
        if (!userIds.has(mId)) {
          console.warn(`⚠️ Project ${p._id} has non-existent member: ${mId}`);
          orphanCount++;
        }
      }
    }

    // Check application references
    for (const a of applications) {
      const aProjId = (a.project?._id || a.project)?.toString();
      const aAppId = (a.applicant?._id || a.applicant)?.toString();
      if (!projectIds.has(aProjId)) {
        console.warn(`⚠️ Application ${a._id} points to non-existent project: ${aProjId}`);
        orphanCount++;
      }
      if (!userIds.has(aAppId)) {
        console.warn(`⚠️ Application ${a._id} points to non-existent applicant: ${aAppId}`);
        orphanCount++;
      }
    }

    // Check message references
    for (const m of messages) {
      const mProjId = (m.project?._id || m.project)?.toString();
      const mSenderId = (m.sender?._id || m.sender)?.toString();
      if (!projectIds.has(mProjId)) {
        console.warn(`⚠️ Message ${m._id} points to non-existent project: ${mProjId}`);
        orphanCount++;
      }
      if (!userIds.has(mSenderId)) {
        console.warn(`⚠️ Message ${m._id} points to non-existent sender: ${mSenderId}`);
        orphanCount++;
      }
    }

    // Check notification references
    for (const n of notifications) {
      const nRecipId = (n.recipient?._id || n.recipient)?.toString();
      if (!userIds.has(nRecipId)) {
        console.warn(`⚠️ Notification ${n._id} points to non-existent recipient: ${nRecipId}`);
        orphanCount++;
      }
    }

    if (orphanCount === 0) {
      console.log('✅ Integrity Check Passed: Zero orphaned or broken references found.');
    }

    // 9. Summary
    console.log('\n======================================================');
    console.log('📊 CONCISE AUDIT SUMMARY');
    console.log('======================================================');
    console.log(`TOTAL USERS: ${users.length}`);
    console.log(`TOTAL PROJECTS: ${projects.length}`);
    console.log(`TOTAL PROJECT MEMBERS: ${totalProjectMembersCount}`);
    console.log(`TOTAL CHAT/MESSAGE RECORDS: ${messages.length}`);
    console.log(`TOTAL UPLOADED FILES: ${fileMessagesCount + localFiles.length}`);
    console.log(`TOTAL OTHER RECORDS: ${applications.length + notifications.length} (${applications.length} applications, ${notifications.length} notifications)`);
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Audit error:', err);
    process.exit(1);
  }
}

auditDatabase();
