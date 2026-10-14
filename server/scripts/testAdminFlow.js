const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
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

const adminController = require('../controllers/adminController');

// Mock req and res helpers
const mockReq = (user, body = {}, query = {}, params = {}) => ({
  user,
  body,
  query,
  params,
  headers: { 'x-forwarded-for': '127.0.0.1', 'user-agent': 'TestRunner/1.0' },
  socket: { remoteAddress: '127.0.0.1' },
});

const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

const runTests = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hiremyskills';
    await mongoose.connect(mongoUri);
    console.log('🔗 Connected to database for deep Admin testing...\n');

    // 1. Fetch SuperAdmin user
    const admin = await User.findOne({ role: 'superadmin' });
    if (!admin) {
      throw new Error('SuperAdmin not found! Run seedAdminData.js first.');
    }
    console.log(`✅ [AUTH] Verified SuperAdmin: ${admin.email}`);

    // 2. Test Dashboard Analytics
    console.log('\n--- 1. Testing Dashboard Analytics ---');
    const reqDash = mockReq(admin);
    const resDash = mockRes();
    await adminController.getDashboardAnalytics(reqDash, resDash);
    console.log('Status:', resDash.statusCode);
    console.log('Metrics Total Users:', resDash.data.metrics.totalUsers);
    console.log('Metrics Total Projects:', resDash.data.metrics.totalProjects);
    console.log('Metrics Platform Volume:', resDash.data.metrics.totalVolume);
    console.log('Metrics Total Commissions:', resDash.data.metrics.totalCommissions);
    console.log('Monthly Trend Count:', resDash.data.monthlyData.length);
    if (!resDash.data.metrics) throw new Error('Dashboard analytics failed');
    console.log('✅ Dashboard Analytics endpoint passed!');

    // 3. Test Users Management
    console.log('\n--- 2. Testing Users Management ---');
    const reqUsers = mockReq(admin, {}, { role: 'all', limit: 5 });
    const resUsers = mockRes();
    await adminController.getUsers(reqUsers, resUsers);
    console.log(`Fetched ${resUsers.data.users.length} users. Total: ${resUsers.data.total}`);
    if (resUsers.data.users.length === 0) throw new Error('No users found');

    const sampleUser = resUsers.data.users[0];
    const reqUserById = mockReq(admin, {}, {}, { id: sampleUser._id });
    const resUserById = mockRes();
    await adminController.getUserById(reqUserById, resUserById);
    console.log(`User detail: ${resUserById.data.user.name} (Projects: ${resUserById.data.stats.projectsCount})`);

    // Test update user status
    const reqStatus = mockReq(admin, { status: 'active', isVerified: true }, {}, { id: sampleUser._id });
    const resStatus = mockRes();
    await adminController.updateUserStatus(reqStatus, resStatus);
    console.log('User status update response:', resStatus.data.message);
    console.log('✅ User Management endpoints passed!');

    // 4. Test Projects Management
    console.log('\n--- 3. Testing Projects Management ---');
    const reqProj = mockReq(admin, {}, { limit: 5 });
    const resProj = mockRes();
    await adminController.getProjects(reqProj, resProj);
    console.log(`Fetched ${resProj.data.projects.length} projects. Total: ${resProj.data.total}`);

    if (resProj.data.projects.length > 0) {
      const pId = resProj.data.projects[0]._id;
      const reqPStatus = mockReq(admin, { isFeatured: true, adminNotes: 'Verified project' }, {}, { id: pId });
      const resPStatus = mockRes();
      await adminController.updateProjectStatus(reqPStatus, resPStatus);
      console.log('Project status update response:', resPStatus.data.message);
    }
    console.log('✅ Projects Management endpoints passed!');

    // 5. Test ReadyMade Projects
    console.log('\n--- 4. Testing Ready-Made Projects ---');
    const reqRM = mockReq(admin, {}, { limit: 5 });
    const resRM = mockRes();
    await adminController.getReadyMadeProjects(reqRM, resRM);
    console.log(`Fetched ${resRM.data.projects.length} ready-made digital projects.`);

    const reqCreateRM = mockReq(admin, {
      title: 'Automated Test Digital Product',
      description: 'Test product for automated verification suite.',
      category: 'webdev',
      price: 999,
      techStack: ['Node.js', 'Express', 'React'],
      isFeatured: false,
    });
    const resCreateRM = mockRes();
    await adminController.createReadyMadeProject(reqCreateRM, resCreateRM);
    console.log('Created product ID:', resCreateRM.data.project._id);

    // Clean up created test product
    const reqDelRM = mockReq(admin, {}, {}, { id: resCreateRM.data.project._id });
    const resDelRM = mockRes();
    await adminController.deleteReadyMadeProject(reqDelRM, resDelRM);
    console.log('Deleted test product response:', resDelRM.data.message);
    console.log('✅ Ready-Made Projects endpoints passed!');

    // 6. Test Transactions & Commissions
    console.log('\n--- 5. Testing Transactions & Finance ---');
    const reqTxn = mockReq(admin, {}, { limit: 5 });
    const resTxn = mockRes();
    await adminController.getTransactions(reqTxn, resTxn);
    console.log(`Fetched ${resTxn.data.transactions.length} transactions. Summary: Gross ₹${resTxn.data.summary.totalAmount}`);

    const reqCom = mockReq(admin);
    const resCom = mockRes();
    await adminController.getCommissions(reqCom, resCom);
    console.log(`Commission Rate: ${resCom.data.commissionRate}%, Lifetime: ₹${resCom.data.overview.totalCommissionEarned}`);
    console.log('✅ Transactions & Finance endpoints passed!');

    // 7. Test Payouts
    console.log('\n--- 6. Testing Payout Requests ---');
    const reqPO = mockReq(admin, {}, { limit: 5 });
    const resPO = mockRes();
    await adminController.getPayouts(reqPO, resPO);
    console.log(`Fetched ${resPO.data.payouts.length} payouts.`);
    console.log('✅ Payout Requests endpoints passed!');

    // 8. Test Tickets / Disputes
    console.log('\n--- 7. Testing Complaints & Support Tickets ---');
    const reqTkt = mockReq(admin, {}, { limit: 5 });
    const resTkt = mockRes();
    await adminController.getTickets(reqTkt, resTkt);
    console.log(`Fetched ${resTkt.data.tickets.length} tickets.`);

    if (resTkt.data.tickets.length > 0) {
      const tId = resTkt.data.tickets[0]._id;
      const reqReply = mockReq(admin, { message: 'Automated test admin resolution message.' }, {}, { id: tId });
      const resReply = mockRes();
      await adminController.replyTicket(reqReply, resReply);
      console.log('Ticket reply response:', resReply.data.message);
    }
    console.log('✅ Complaints & Tickets endpoints passed!');

    // 9. Test Announcements
    console.log('\n--- 8. Testing Announcements ---');
    const reqAnn = mockReq(admin);
    const resAnn = mockRes();
    await adminController.getAnnouncements(reqAnn, resAnn);
    console.log(`Fetched ${resAnn.data.length} announcements.`);
    console.log('✅ Announcements endpoints passed!');

    // 10. Test Audit Logs
    console.log('\n--- 9. Testing Audit Trail ---');
    const reqAudit = mockReq(admin, {}, { limit: 5 });
    const resAudit = mockRes();
    await adminController.getAuditLogs(reqAudit, resAudit);
    console.log(`Fetched ${resAudit.data.logs.length} audit logs. Total actions logged: ${resAudit.data.total}`);
    if (resAudit.data.logs.length === 0) throw new Error('No audit logs found');
    console.log(`Latest audit log: [${resAudit.data.logs[0].action}] on ${resAudit.data.logs[0].targetModel} (${resAudit.data.logs[0].targetName})`);
    console.log('✅ Audit Logs endpoints passed!');

    // 11. Test Platform Settings
    console.log('\n--- 10. Testing Platform Settings ---');
    const reqSet = mockReq(admin);
    const resSet = mockRes();
    await adminController.getSettings(reqSet, resSet);
    console.log(`Site Name: ${resSet.data.siteName}, Commission: ${resSet.data.commissionRate}%, Min Payout: ₹${resSet.data.minPayoutAmount}`);
    console.log('✅ Platform Settings endpoints passed!');

    console.log('\n======================================================');
    console.log('🎉 ALL HIREMYSKILLS ADMIN PANEL BACKEND TESTS PASSED!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
};

runTests();
