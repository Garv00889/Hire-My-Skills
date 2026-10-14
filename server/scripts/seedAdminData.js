const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Project = require('../models/Project');
const Application = require('../models/Application');
const ReadyMadeProject = require('../models/ReadyMadeProject');
const Transaction = require('../models/Transaction');
const Payout = require('../models/Payout');
const Review = require('../models/Review');
const Ticket = require('../models/Ticket');
const PlatformSettings = require('../models/PlatformSettings');
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');

const seed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiremyskills';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for admin seeding...');

    // 1. Ensure SuperAdmin exists
    const adminEmail = 'admin@hiremyskills.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'Super Administrator',
        email: adminEmail,
        password: 'AdminPassword123!',
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
      console.log(`Created SuperAdmin: ${adminEmail} / AdminPassword123!`);
    } else {
      admin.role = 'superadmin';
      admin.status = 'active';
      admin.isVerified = true;
      await admin.save();
      console.log(`Existing SuperAdmin updated: ${adminEmail}`);
    }

    // 2. Ensure PlatformSettings exists
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({
        siteName: 'HireMySkills',
        supportEmail: 'support@hiremyskills.com',
        contactPhone: '+91 98765 43210',
        commissionRate: 10,
        minPayoutAmount: 500,
        currency: 'INR',
        maintenanceMode: false,
        allowNewRegistrations: true,
        allowProjectPosting: true,
      });
      console.log('Created default PlatformSettings');
    }

    // 3. Ensure student & client users exist for testing
    let student = await User.findOne({ email: 'rahul.sharma@example.com' });
    if (!student) {
      student = await User.create({
        name: 'Rahul Sharma',
        email: 'rahul.sharma@example.com',
        password: 'Password123!',
        role: 'student',
        status: 'active',
        isVerified: true,
        tagline: 'Final Year CS Student | Full Stack Developer',
        location: 'Bengaluru, Karnataka',
        contactNumber: '+91 98765 11111',
        skills: ['React', 'Node.js', 'MongoDB', 'Python', 'Tailwind'],
        walletBalance: 4200,
        totalEarnings: 15400,
      });
      console.log('Created sample student user');
    }

    let client = await User.findOne({ email: 'priya.tech@startup.in' });
    if (!client) {
      client = await User.create({
        name: 'Priya Mehta',
        email: 'priya.tech@startup.in',
        password: 'Password123!',
        role: 'client',
        status: 'active',
        isVerified: true,
        tagline: 'Product Lead @ EduTech Labs',
        location: 'Pune, Maharashtra',
        contactNumber: '+91 98765 22222',
        totalSpent: 28500,
      });
      console.log('Created sample client user');
    }

    // 4. Ensure sample projects exist
    let project = await Project.findOne({ title: { $regex: 'AI-Powered', $options: 'i' } });
    if (!project) {
      project = await Project.create({
        title: 'AI-Powered Resume Analyzer for Tech Placements',
        description: 'Build an automated resume parser using Python NLP and LLMs that scores tech candidate resumes against job descriptions and provides missing keyword tips.',
        skillRequirements: ['Python', 'FastAPI', 'React', 'NLP', 'OpenAI'],
        budget: 12000,
        currency: 'INR',
        category: 'AI',
        level: 'intermediate',
        membersRequired: 3,
        creator: client._id,
        status: 'open',
        isFeatured: true,
      });
      console.log('Created sample project');
    }

    // 5. Ensure ReadyMade projects exist
    const readyCount = await ReadyMadeProject.countDocuments();
    if (readyCount === 0) {
      await ReadyMadeProject.create([
        {
          title: 'Full Stack MERN Freelance Marketplace',
          description: 'Production-ready freelance marketplace with React, Express, MongoDB, Socket.io chat, and modern responsive UI.',
          category: 'webdev',
          price: 2499,
          currency: 'INR',
          techStack: ['React', 'Node.js', 'Express', 'MongoDB'],
          demoUrl: 'https://hiremyskills.demo.com',
          seller: student._id,
          status: 'approved',
          isFeatured: true,
          salesCount: 18,
          rating: 4.9,
          reviewCount: 9,
        },
        {
          title: 'Smart Health Monitoring IoT & Mobile Dashboard',
          description: 'Wearable IoT data sync with ESP32, Firebase real-time database, and Flutter Android dashboard with vitals alert push notifications.',
          category: 'college project',
          price: 1800,
          currency: 'INR',
          techStack: ['Flutter', 'ESP32', 'C++', 'Firebase'],
          demoUrl: 'https://smarthealth.demo.com',
          seller: student._id,
          status: 'approved',
          isFeatured: true,
          salesCount: 24,
          rating: 4.8,
          reviewCount: 14,
        },
      ]);
      console.log('Created sample ReadyMadeProjects');
    }

    // 6. Ensure sample Transactions exist
    const txCount = await Transaction.countDocuments();
    if (txCount === 0) {
      await Transaction.create([
        {
          transactionId: 'TXN-INIT-001',
          type: 'project_payment',
          amount: 10000,
          platformFee: 1000,
          netAmount: 9000,
          currency: 'INR',
          status: 'completed',
          payer: client._id,
          payee: student._id,
          project: project._id,
          paymentGateway: 'upi',
          gatewayTransactionId: 'UPI-RAZORPAY-771234',
          notes: 'Client milestone release for Backend API architecture',
        },
        {
          transactionId: 'TXN-INIT-002',
          type: 'ready_made_purchase',
          amount: 2499,
          platformFee: 249.9,
          netAmount: 2249.1,
          currency: 'INR',
          status: 'completed',
          payer: client._id,
          payee: student._id,
          paymentGateway: 'upi',
          gatewayTransactionId: 'UPI-RAZORPAY-771235',
          notes: 'Purchase of Full Stack MERN Freelance Marketplace',
        },
      ]);
      console.log('Created sample Transactions');
    }

    // 7. Ensure sample Payouts exist
    const poCount = await Payout.countDocuments();
    if (poCount === 0) {
      await Payout.create({
        payoutId: 'PO-2024-001',
        user: student._id,
        amount: 2500,
        currency: 'INR',
        paymentMethod: 'upi',
        paymentDetails: {
          upiId: 'rahul.sharma@oksbi',
          accountHolderName: 'Rahul Sharma',
        },
        status: 'pending',
        adminNotes: 'Student requested withdrawal to SBI UPI handle',
      });
      console.log('Created sample Payout request');
    }

    // 8. Ensure sample Ticket exists
    const tktCount = await Ticket.countDocuments();
    if (tktCount === 0) {
      await Ticket.create({
        ticketNumber: 'TKT-8801',
        reporter: student._id,
        reportedUser: client._id,
        relatedProject: project._id,
        type: 'dispute',
        subject: 'Milestone 2 Approval Delay',
        description: 'Completed milestone delivery 5 days ago. Client has reviewed code on GitHub but has not released escrow milestone.',
        priority: 'high',
        status: 'open',
        responses: [
          {
            sender: student._id,
            message: 'All PRs have been merged to main repo. Kindly review.',
            isAdmin: false,
          },
        ],
      });
      console.log('Created sample Ticket');
    }

    // 9. Ensure sample Announcement exists
    const annCount = await Announcement.countDocuments();
    if (annCount === 0) {
      await Announcement.create({
        title: 'Platform Upgrade: Direct UPI Payouts Now Live!',
        message: 'Student freelancers can now request instant withdrawals straight to their Google Pay, PhonePe, or BHIM UPI ID with zero platform withdrawal fees.',
        targetAudience: 'all',
        priority: 'info',
        createdBy: admin._id,
        isActive: true,
      });
      console.log('Created sample Announcement');
    }

    // 10. Audit log
    await AuditLog.create({
      admin: admin._id,
      action: 'SYSTEM_INITIALIZATION',
      targetModel: 'Security',
      targetName: 'Database Seed',
      details: { summary: 'Initialized SuperAdmin, sample data, and platform settings.' },
    });

    console.log('✅ Admin seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seed();
