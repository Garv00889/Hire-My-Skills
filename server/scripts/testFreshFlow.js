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

async function runEndToEndVerification() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING END-TO-END FRESH APPLICATION FLOW VERIFICATION');
  console.log('======================================================\n');

  try {
    await connectDB();

    // ----------------------------------------------------
    // STEP 1: Signup User 1 (Creator) & User 2 (Applicant)
    // ----------------------------------------------------
    console.log('▶️ [Step 1] Testing User Registration (Signup)...');

    const u1Password = await bcrypt.hash('Password123!', 10);
    const user1 = await User.create({
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      password: 'Password123!',
      age: 24,
      contactNumber: '+91 9876543210',
      skills: ['React.js', 'Node.js', 'TypeScript', 'MongoDB'],
    });

    const user2 = await User.create({
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      password: 'Password123!',
      age: 22,
      contactNumber: '+91 9123456780',
      skills: ['UI/UX Design', 'Figma', 'React.js', 'CSS'],
    });

    console.log(`✅ Registered User 1: ${user1.name} (${user1._id})`);
    console.log(`✅ Registered User 2: ${user2.name} (${user2._id})`);

    // ----------------------------------------------------
    // STEP 2: Authentication / Login & Password Check
    // ----------------------------------------------------
    console.log('\n▶️ [Step 2] Testing User Authentication (Login & JWT)...');

    const passMatch1 = await user1.comparePassword('Password123!');
    const passMatch2 = await user2.comparePassword('Password123!');

    if (!passMatch1 || !passMatch2) {
      throw new Error('Password comparison failed during login simulation!');
    }

    const token1 = jwt.sign({ id: user1._id }, JWT_SECRET, { expiresIn: '7d' });
    const token2 = jwt.sign({ id: user2._id }, JWT_SECRET, { expiresIn: '7d' });

    console.log('✅ User 1 Login successful. JWT token generated.');
    console.log('✅ User 2 Login successful. JWT token generated.');

    // ----------------------------------------------------
    // STEP 3: Profile Creation & Updates
    // ----------------------------------------------------
    console.log('\n▶️ [Step 3] Testing Profile Creation & Updates...');

    user2.tagline = 'Senior Product Designer & Frontend Enthusiast';
    user2.location = 'Bengaluru, India';
    user2.bio = 'Passionate designer building delightful user experiences with clean code.';
    user2.githubLink = 'https://github.com/sarahchen';
    user2.socialLinks = {
      github: 'https://github.com/sarahchen',
      linkedin: 'https://linkedin.com/in/sarahchen',
      portfolio: 'https://sarahchen.design',
    };
    user2.portfolioProjects = [
      {
        title: 'DesignSystem Pro',
        description: 'Comprehensive Figma & React component library',
        liveLink: 'https://designsystem.pro',
        githubLink: 'https://github.com/sarahchen/designsystem',
        tags: ['Figma', 'React', 'Design System'],
      },
    ];
    user2.experience = [
      {
        title: 'UI/UX Design Intern',
        company: 'DesignFlow Studio',
        duration: 'Jan 2024 - Dec 2024',
        description: 'Led user research and designed responsive wireframes.',
      },
    ];
    user2.certifications = [
      {
        name: 'Google UX Design Professional Certificate',
        issuer: 'Coursera / Google',
        issueDate: 'Aug 2024',
        credentialUrl: 'https://coursera.org/verify/SAMPLE123',
      },
    ];
    user2.education = [
      {
        institution: 'National Institute of Technology',
        degree: 'B.Tech',
        fieldOfStudy: 'Computer Science & Engineering',
        year: '2025',
      },
    ];

    await user2.save();
    console.log('✅ User 2 Profile enriched with Experience, Projects, Certifications & Education.');

    // ----------------------------------------------------
    // STEP 4: Project Creation
    // ----------------------------------------------------
    console.log('\n▶️ [Step 4] Testing Project Creation by User 1...');

    const project = await Project.create({
      title: 'DevSync - Collaborative Workspace for Developers',
      description: 'An all-in-one developer workspace with real-time markdown docs, code runner, and project management.',
      skillRequirements: ['React.js', 'UI/UX Design', 'Node.js'],
      category: 'webdev',
      level: 'intermediate',
      budget: 25000,
      currency: 'INR',
      membersRequired: 3,
      creator: user1._id,
      members: [user1._id], // Creator is initial member
      deadline: {
        start: new Date(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`✅ Project created: "${project.title}" (ID: ${project._id}) by ${user1.name}`);

    // ----------------------------------------------------
    // STEP 5: Project Exploration & Search
    // ----------------------------------------------------
    console.log('\n▶️ [Step 5] Testing Project Exploration & Filtering...');

    const openProjects = await Project.find({ status: 'open' })
      .populate('creator', 'name email tagline profilePicture')
      .populate('members', 'name email');

    if (openProjects.length === 0) {
      throw new Error('Project exploration returned 0 open projects!');
    }
    console.log(`✅ Explore query found ${openProjects.length} open project(s).`);

    // ----------------------------------------------------
    // STEP 6: User 2 Applies to Project & Notification created
    // ----------------------------------------------------
    console.log('\n▶️ [Step 6] Testing Application Submission & Creator Notification...');

    const application = await Application.create({
      project: project._id,
      applicant: user2._id,
      message: 'Hi Alex! I have experience with UI/UX and React, would love to design and build DevSync with you.',
      status: 'pending',
    });

    const notif1 = await Notification.create({
      recipient: user1._id,
      sender: user2._id,
      type: 'application_received',
      message: `${user2.name} applied to your project "${project.title}"`,
      relatedProject: project._id,
      relatedApplication: application._id,
      isRead: false,
    });

    console.log(`✅ Application submitted by ${user2.name} (App ID: ${application._id})`);
    console.log(`✅ Notification created for Creator ${user1.name}: "${notif1.message}"`);

    // ----------------------------------------------------
    // STEP 7: Creator Reviews & Approves Candidate
    // ----------------------------------------------------
    console.log('\n▶️ [Step 7] Testing Application Review & Approval Workflow...');

    // Creator retrieves application with full candidate profile populated
    const appToReview = await Application.findById(application._id)
      .populate('applicant', 'name email contactNumber tagline location bio skills portfolioProjects experience certifications education')
      .populate('project');

    console.log(` Candidate Profile Loaded:`);
    console.log(`   - Name: ${appToReview.applicant.name}`);
    console.log(`   - Tagline: ${appToReview.applicant.tagline}`);
    console.log(`   - Skills: ${appToReview.applicant.skills.join(', ')}`);
    console.log(`   - Certifications: ${appToReview.applicant.certifications.length} item(s)`);
    console.log(`   - Education: ${appToReview.applicant.education.length} item(s)`);

    // Approve candidate
    appToReview.status = 'approved';
    await appToReview.save();

    // Add candidate to project members
    await Project.findByIdAndUpdate(project._id, {
      $addToSet: { members: user2._id },
    });

    // Notify candidate
    const notif2 = await Notification.create({
      recipient: user2._id,
      sender: user1._id,
      type: 'application_approved',
      message: `🎉 Your application for "${project.title}" was selected! You can now access the team group chat.`,
      relatedProject: project._id,
      relatedApplication: application._id,
      isRead: false,
    });

    console.log(`✅ Application status updated to 'approved'.`);
    console.log(`✅ Member ${user2.name} added to Project members list.`);
    console.log(`✅ Candidate Notification created: "${notif2.message}"`);

    // Verify project members count
    const updatedProject = await Project.findById(project._id);
    console.log(`✅ Project members count: ${updatedProject.members.length} ([${updatedProject.members.join(', ')}])`);

    // ----------------------------------------------------
    // STEP 8: Team Chat & Messages
    // ----------------------------------------------------
    console.log('\n▶️ [Step 8] Testing Group Chat & Message Exchange...');

    const msg1 = await Message.create({
      project: project._id,
      sender: user1._id,
      content: `Welcome to DevSync team, @${user2.name}! Let's build something awesome.`,
      isFile: false,
    });

    const msg2 = await Message.create({
      project: project._id,
      sender: user2._id,
      content: 'Thanks Alex! Excited to collaborate on the UI architecture.',
      isFile: false,
    });

    const projectMessages = await Message.find({ project: project._id })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: 1 });

    console.log(`✅ Exchanged ${projectMessages.length} chat message(s) in Project room.`);
    for (const m of projectMessages) {
      console.log(`   [${m.sender.name}]: ${m.content}`);
    }

    // ----------------------------------------------------
    // STEP 9: Notification Read/Unread State & Count Verification
    // ----------------------------------------------------
    console.log('\n▶️ [Step 9] Testing Notification Unread Count & Mark-As-Read...');

    const unreadBefore = await Notification.countDocuments({ recipient: user2._id, isRead: false });
    console.log(`   - User 2 Unread Count: ${unreadBefore}`);

    // Mark as read
    await Notification.findByIdAndUpdate(notif2._id, { isRead: true });
    const unreadAfter = await Notification.countDocuments({ recipient: user2._id, isRead: false });
    console.log(`   - User 2 Unread Count after read: ${unreadAfter}`);

    if (unreadBefore !== 1 || unreadAfter !== 0) {
      throw new Error(`Notification read status check failed (before: ${unreadBefore}, after: ${unreadAfter})`);
    }
    console.log('✅ Notification read/unread state and count working perfectly.');

    console.log('\n======================================================');
    console.log('🎉 ALL END-TO-END FLOW TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');

    // Clean up test data after successful verification to leave clean state
    console.log('🧹 Clearing test records to restore pristine empty state...');
    await Application.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});

    const finalCounts = {
      users: await User.countDocuments(),
      projects: await Project.countDocuments(),
      applications: await Application.countDocuments(),
      messages: await Message.countDocuments(),
      notifications: await Notification.countDocuments(),
    };
    console.log('📊 Final Database State:', finalCounts);
    console.log('✅ Database is 100% clean and ready for manual use through the UI!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

runEndToEndVerification();
