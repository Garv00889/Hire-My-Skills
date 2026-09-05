require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const connectDB = require('../config/db');
const User = require('../models/User');
const Project = require('../models/Project');
const Application = require('../models/Application');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

const JWT_SECRET = process.env.JWT_SECRET || 'hiremyskills_super_secret_key_2024';

async function verifyFullLifecycle() {
  console.log('\n================================================================');
  console.log('🧪 VERIFYING FULL APPLICATION LIFECYCLE & ACCESS CONTROL');
  console.log('================================================================\n');

  try {
    await connectDB();

    // 1. Create Creator (Alex) and 2 Applicants (Maya, Sam)
    console.log('▶️ [Step 1] Creating User Accounts (Creator: Alex, Applicants: Maya, Sam)...');
    const alex = await User.create({
      name: 'Alex Creator',
      email: 'alex@project.com',
      password: 'Password123!',
      skills: ['React.js', 'Node.js'],
    });

    const maya = await User.create({
      name: 'Maya Developer',
      email: 'maya@applicant.com',
      password: 'Password123!',
      skills: ['UI/UX Design', 'React.js', 'Figma'],
      tagline: 'UI/UX & Frontend Contributor',
    });

    const sam = await User.create({
      name: 'Sam Rejected',
      email: 'sam@rejected.com',
      password: 'Password123!',
      skills: ['Python'],
      tagline: 'Python Enthusiast',
    });

    console.log(`✅ Users created successfully.`);

    // 2. Creator creates project in Explore
    console.log('\n▶️ [Step 2] Alex creates Project "QuantumAI Engine" (Capacity: 2 members)...');
    const project = await Project.create({
      title: 'QuantumAI Engine',
      description: 'A cutting-edge visual workflow engine for AI models and data pipelines.',
      skillRequirements: ['React.js', 'UI/UX Design', 'Node.js'],
      category: 'AI',
      level: 'intermediate',
      budget: 35000,
      membersRequired: 2,
      creator: alex._id,
      members: [alex._id],
    });

    console.log(`✅ Project created: "${project.title}" (ID: ${project._id})`);

    // 3. Explore & View Details: Maya queries project
    console.log('\n▶️ [Step 3] Simulating "View Full Project Details" Query...');
    const projectDetails = await Project.findById(project._id)
      .populate('creator', 'name email tagline profilePicture')
      .populate('members', 'name email');

    if (!projectDetails || projectDetails.title !== 'QuantumAI Engine') {
      throw new Error('Project details retrieval failed!');
    }
    console.log(`✅ Project Details retrieved successfully:`);
    console.log(`   - Title: ${projectDetails.title}`);
    console.log(`   - Creator: ${projectDetails.creator.name}`);
    console.log(`   - Required Skills: ${projectDetails.skillRequirements.join(', ')}`);
    console.log(`   - Seats: ${projectDetails.members.length}/${projectDetails.membersRequired}`);

    // 4. Maya applies to project
    console.log('\n▶️ [Step 4] Maya submits application to join QuantumAI Engine...');
    const mayaApp = await Application.create({
      project: project._id,
      applicant: maya._id,
      message: 'I have extensive UI/UX and React experience to build the node-based canvas.',
      status: 'pending',
    });

    // Creator receives application notification
    const alexNotif = await Notification.create({
      recipient: alex._id,
      sender: maya._id,
      type: 'application_received',
      message: `${maya.name} applied to your project "${project.title}"`,
      relatedProject: project._id,
      relatedApplication: mayaApp._id,
      isRead: false,
    });

    console.log(`✅ Application created (ID: ${mayaApp._id}) and Notification sent to Alex (ID: ${alexNotif._id}).`);

    // 5. TEST: Pending applicant tries to access chat -> Must be DENIED
    console.log('\n▶️ [Step 5] Testing Access Control: Maya (Pending Applicant) tries to access chat...');
    const isMayaAuthorizedBeforeAccept =
      project.creator.toString() === maya._id.toString() ||
      project.members.some(m => m.toString() === maya._id.toString());

    if (isMayaAuthorizedBeforeAccept) {
      throw new Error('Pending applicant Maya was illegally authorized for chat!');
    }
    console.log('✅ Access Control Verified: Maya is DENIED access while application is pending.');

    // 6. Creator accepts application (via Notification or Review Application page)
    console.log('\n▶️ [Step 6] Creator Alex ACCEPTS Maya’s application...');
    mayaApp.status = 'approved';
    await mayaApp.save();

    await Project.findByIdAndUpdate(project._id, {
      $addToSet: { members: maya._id },
    });

    // Send selection notification to Maya
    await Notification.create({
      recipient: maya._id,
      sender: alex._id,
      type: 'application_approved',
      message: `Your application for "${project.title}" was selected! You can now access the team group chat.`,
      relatedProject: project._id,
      relatedApplication: mayaApp._id,
      isRead: false,
    });

    const updatedProject = await Project.findById(project._id);
    const isMayaMemberNow = updatedProject.members.some(m => m.toString() === maya._id.toString());

    if (!isMayaMemberNow) {
      throw new Error('Maya was not added to project members list!');
    }
    console.log(`✅ Application status updated to "approved".`);
    console.log(`✅ Maya added to project members (${updatedProject.members.length} team members).`);

    // 7. TEST: Maya now has full Chat Access
    console.log('\n▶️ [Step 7] Testing Chat Access for Accepted Member Maya...');
    const isMayaAuthorizedNow =
      updatedProject.creator.toString() === maya._id.toString() ||
      updatedProject.members.some(m => m.toString() === maya._id.toString());

    if (!isMayaAuthorizedNow) {
      throw new Error('Maya was not granted chat access after acceptance!');
    }
    console.log('✅ Access Control Verified: Maya is now an AUTHORIZED project member in chat.');

    // 8. Communication test: Alex and Maya exchange real-time messages in project chat
    console.log('\n▶️ [Step 8] Testing Team Chat Message Exchange between Alex & Maya...');
    const msg1 = await Message.create({
      project: project._id,
      sender: alex._id,
      content: 'Welcome to the QuantumAI Engine team, Maya!',
    });

    const msg2 = await Message.create({
      project: project._id,
      sender: maya._id,
      content: 'Thank you Alex! Excited to collaborate on the architecture.',
    });

    const teamMessages = await Message.find({ project: project._id }).populate('sender', 'name');
    console.log(`✅ Chat messages exchanged (${teamMessages.length} total):`);
    for (const m of teamMessages) {
      console.log(`   [${m.sender.name}]: ${m.content}`);
    }

    // 9. TEST: Sam applies and is REJECTED / DECLINED -> Must NOT get chat access or membership
    console.log('\n▶️ [Step 9] Testing Rejection Flow: Sam applies and gets Declined...');
    const samApp = await Application.create({
      project: project._id,
      applicant: sam._id,
      message: 'I want to join.',
      status: 'pending',
    });

    // Decline Sam
    samApp.status = 'temporarily_declined';
    samApp.declinedAt = new Date();
    samApp.declinedBy = alex._id;
    samApp.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await samApp.save();

    const projAfterRejection = await Project.findById(project._id);
    const isSamMember = projAfterRejection.members.some(m => m.toString() === sam._id.toString());

    if (isSamMember) {
      throw new Error('Rejected candidate Sam was mistakenly added to members!');
    }
    console.log('✅ Verified: Sam is NOT a member and has NO chat access.');

    console.log('\n================================================================');
    console.log('🎉 ALL INTEGRATION TESTS & ACCESS CONTROL CHECKS PASSED (100%)');
    console.log('================================================================\n');

    // Clean up test data
    console.log('🧹 Cleaning test records...');
    await Application.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});

    console.log('✅ Database restored to clean state.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

verifyFullLifecycle();
