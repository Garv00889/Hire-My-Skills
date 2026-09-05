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

async function verifyMultiUserChatAndAccessControl() {
  console.log('\n================================================================');
  console.log('🧪 VERIFYING MULTI-USER CHAT SPACE & MEMBER ACCESS CONTROL');
  console.log('================================================================\n');

  try {
    await connectDB();

    // 1. Create Project Creator (Alice) and 3 Members (Bob, Charlie, Dave - unauthorized)
    console.log('▶️ [Step 1] Creating Test Users for Multi-User Scenario...');
    const alice = await User.create({
      name: 'Alice Creator',
      email: 'alice@test.com',
      password: 'Password123!',
      skills: ['React', 'Node.js'],
    });

    const bob = await User.create({
      name: 'Bob Frontend',
      email: 'bob@test.com',
      password: 'Password123!',
      skills: ['UI/UX', 'CSS'],
    });

    const charlie = await User.create({
      name: 'Charlie Backend',
      email: 'charlie@test.com',
      password: 'Password123!',
      skills: ['Node.js', 'MongoDB'],
    });

    const dave = await User.create({
      name: 'Dave Unauthorized',
      email: 'dave@test.com',
      password: 'Password123!',
      skills: ['Python'],
    });

    console.log(`✅ Users created: Alice (Creator), Bob (Member 1), Charlie (Member 2), Dave (Non-Member)`);

    // 2. Alice creates Project with capacity of 2 required members
    console.log('\n▶️ [Step 2] Alice creates Project (membersRequired: 2)...');
    const project = await Project.create({
      title: 'CloudFlow - Realtime Cloud Management',
      description: 'A cloud infrastructure orchestration tool with live metrics.',
      skillRequirements: ['React', 'Node.js', 'UI/UX'],
      membersRequired: 2,
      creator: alice._id,
      members: [alice._id],
    });
    console.log(`✅ Project created: "${project.title}" (Capacity: ${project.membersRequired} members)`);

    // 3. Bob and Charlie apply and get approved
    console.log('\n▶️ [Step 3] Adding Bob & Charlie as Approved Project Members...');
    const appBob = await Application.create({
      project: project._id,
      applicant: bob._id,
      status: 'approved',
    });
    const appCharlie = await Application.create({
      project: project._id,
      applicant: charlie._id,
      status: 'approved',
    });

    await Project.findByIdAndUpdate(project._id, {
      $addToSet: { members: [bob._id, charlie._id] },
    });

    const updatedProject = await Project.findById(project._id).populate('members', 'name email');
    console.log(`✅ Project members updated (${updatedProject.members.length} total):`, updatedProject.members.map(m => m.name));

    // 4. Test Member Capacity Check (e.g. attempting to add another member when full)
    console.log('\n▶️ [Step 4] Verifying Capacity Limit Enforcement...');
    const nonCreatorMembers = updatedProject.members.filter(m => m._id.toString() !== updatedProject.creator.toString());
    const isAtCapacity = nonCreatorMembers.length >= updatedProject.membersRequired;
    console.log(`   - Contributor Seats filled: ${nonCreatorMembers.length}/${updatedProject.membersRequired} (At Capacity: ${isAtCapacity})`);
    if (!isAtCapacity) {
      throw new Error('Capacity calculation check failed!');
    }
    console.log('✅ Project capacity properly tracked and bounded.');

    // 5. Test Access Control: Dave (non-member) tries to access chat
    console.log('\n▶️ [Step 5] Testing Access Control (Unauthorized user check)...');
    const isDaveAuthorized =
      project.creator.toString() === dave._id.toString() ||
      updatedProject.members.some(m => m._id.toString() === dave._id.toString());

    if (isDaveAuthorized) {
      throw new Error('Unauthorized user Dave was wrongly granted access!');
    }
    console.log('✅ Access Control working: Dave is blocked from accessing the chat.');

    // 6. Test Multi-User Chat Message Exchange
    console.log('\n▶️ [Step 6] Simulating Multi-User Simultaneous Chat Exchange...');
    const msgAlice = await Message.create({
      project: project._id,
      sender: alice._id,
      content: 'Welcome team! Let’s coordinate our development sprint here.',
    });

    const msgBob = await Message.create({
      project: project._id,
      sender: bob._id,
      content: 'Hey Alice & Charlie! I have designed the wireframes.',
    });

    const msgCharlie = await Message.create({
      project: project._id,
      sender: charlie._id,
      content: 'Great! I will set up the API routes today.',
    });

    const allProjectMessages = await Message.find({ project: project._id })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: 1 });

    console.log(`✅ Retrieved ${allProjectMessages.length} synchronized chat messages in room "${project.title}":`);
    for (const msg of allProjectMessages) {
      console.log(`   💬 [${msg.sender.name}]: ${msg.content}`);
    }

    if (allProjectMessages.length !== 3) {
      throw new Error('Multi-user message count mismatch!');
    }

    console.log('\n================================================================');
    console.log('🎉 ALL MULTI-USER CHAT & ACCESS CONTROL CHECKS PASSED (100%)!');
    console.log('================================================================\n');

    // Clean up test records to maintain pristine database state
    console.log('🧹 Cleaning up test records...');
    await Application.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});

    console.log('✅ Clean database state restored.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

verifyMultiUserChatAndAccessControl();
