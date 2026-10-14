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

// Helper to record an audit log
const logAudit = async (adminId, action, targetModel, targetId, targetName, details, req) => {
  try {
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers['user-agent'] || '';
    await AuditLog.create({
      admin: adminId,
      action,
      targetModel,
      targetId: targetId ? targetId.toString() : '',
      targetName: targetName || '',
      details,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    console.error('AuditLog error:', err.message);
  }
};

// ==================== DASHBOARD ANALYTICS ====================
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Parallel metric counts
    const [
      totalUsers,
      totalStudents,
      totalClients,
      totalAdmins,
      newUsersToday,
      totalProjects,
      openProjects,
      inProgressProjects,
      completedProjects,
      totalApplications,
      pendingApplications,
      totalReadyMade,
      openTickets,
      pendingPayouts,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ role: { $in: ['admin', 'superadmin', 'moderator', 'support'] } }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      Project.countDocuments(),
      Project.countDocuments({ status: 'open' }),
      Project.countDocuments({ status: 'in_progress' }),
      Project.countDocuments({ status: 'completed' }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'pending' }),
      ReadyMadeProject.countDocuments(),
      Ticket.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
      Payout.countDocuments({ status: 'pending' }),
    ]);

    // Financial calculations
    const financialStats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalVolume: {
            $sum: {
              $cond: [{ $in: ['$type', ['project_payment', 'ready_made_purchase', 'milestone_release']] }, '$amount', 0],
            },
          },
          totalCommissions: { $sum: '$platformFee' },
          totalPayoutsPaid: {
            $sum: { $cond: [{ $eq: ['$type', 'payout'] }, '$amount', 0] },
          },
          totalRefunds: {
            $sum: { $cond: [{ $eq: ['$type', 'refund'] }, '$amount', 0] },
          },
        },
      },
    ]);

    const financials = financialStats[0] || {
      totalVolume: 0,
      totalCommissions: 0,
      totalPayoutsPaid: 0,
      totalRefunds: 0,
    };

    // Category breakdown
    const categoryStats = await Project.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Recent 5 projects
    const recentProjects = await Project.find()
      .populate('creator', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent 5 transactions
    const recentTransactions = await Transaction.find()
      .populate('payer', 'name email')
      .populate('payee', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent 5 audit logs
    const recentAudits = await AuditLog.find()
      .populate('admin', 'name email role')
      .sort({ createdAt: -1 })
      .limit(5);

    // Monthly revenue simulation/aggregation (last 6 months)
    const monthlyData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const mStats = await Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: d, $lt: nextD },
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: '$amount' },
            commission: { $sum: '$platformFee' },
          },
        },
      ]);

      monthlyData.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        revenue: mStats[0]?.revenue || 0,
        commission: mStats[0]?.commission || 0,
      });
    }

    res.json({
      metrics: {
        totalUsers,
        totalStudents,
        totalClients,
        totalAdmins,
        newUsersToday,
        totalProjects,
        openProjects,
        inProgressProjects,
        completedProjects,
        totalApplications,
        pendingApplications,
        totalReadyMade,
        openTickets,
        pendingPayouts,
        totalVolume: financials.totalVolume,
        totalCommissions: financials.totalCommissions,
        totalPayoutsPaid: financials.totalPayoutsPaid,
        totalRefunds: financials.totalRefunds,
      },
      categoryStats,
      monthlyData,
      recentProjects,
      recentTransactions,
      recentAudits,
    });
  } catch (error) {
    console.error('getDashboardAnalytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== USER MANAGEMENT ====================
exports.getUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    if (role && role !== 'all') {
      filter.role = role;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fetch related items
    const [projectsCreated, applications, transactions, reviews, tickets] = await Promise.all([
      Project.find({ creator: user._id }).sort({ createdAt: -1 }),
      Application.find({ applicant: user._id }).populate('project', 'title budget status').sort({ createdAt: -1 }),
      Transaction.find({ $or: [{ payer: user._id }, { payee: user._id }] }).sort({ createdAt: -1 }).limit(10),
      Review.find({ reviewee: user._id }).populate('reviewer', 'name profilePicture').sort({ createdAt: -1 }),
      Ticket.find({ reporter: user._id }).sort({ createdAt: -1 }),
    ]);

    res.json({
      user,
      stats: {
        projectsCount: projectsCreated.length,
        applicationsCount: applications.length,
        reviewsCount: reviews.length,
      },
      projectsCreated,
      applications,
      transactions,
      reviews,
      tickets,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { status, isVerified } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const prevStatus = user.status;
    if (status) user.status = status;
    if (typeof isVerified === 'boolean') user.isVerified = isVerified;

    await user.save();

    await logAudit(
      req.user._id,
      'UPDATE_USER_STATUS',
      'User',
      user._id,
      user.name,
      { prevStatus, newStatus: user.status, isVerified: user.isVerified },
      req
    );

    res.json({ message: 'User status updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role, adminPermissions } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prevent demoting last superadmin
    if (user.role === 'superadmin' && role !== 'superadmin') {
      const superAdminCount = await User.countDocuments({ role: 'superadmin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ message: 'Cannot demote the only SuperAdmin' });
      }
    }

    const prevRole = user.role;
    if (role) user.role = role;
    if (adminPermissions) user.adminPermissions = { ...user.adminPermissions, ...adminPermissions };

    await user.save();

    await logAudit(
      req.user._id,
      'UPDATE_USER_ROLE',
      'User',
      user._id,
      user.name,
      { prevRole, newRole: user.role, adminPermissions },
      req
    );

    res.json({ message: 'User role updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUserNotes = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.adminNotes = adminNotes;
    await user.save();

    res.json({ message: 'Admin notes updated', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'SuperAdmin cannot be deleted' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logAudit(
      req.user._id,
      'DELETE_USER',
      'User',
      req.params.id,
      user.name,
      { email: user.email, role: user.role },
      req
    );

    res.json({ message: 'User permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== PROJECT MANAGEMENT ====================
exports.getProjects = async (req, res) => {
  try {
    const { status, category, level, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (level && level !== 'all') filter.level = level;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('creator', 'name email profilePicture')
        .populate('members', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Project.countDocuments(filter),
    ]);

    // Attach application counts for each project
    const projectIds = projects.map(p => p._id);
    const appCounts = await Application.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: '$project', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    appCounts.forEach(c => {
      countMap[c._id.toString()] = c.count;
    });

    const projectsWithCounts = projects.map(p => ({
      ...p.toObject(),
      applicationsCount: countMap[p._id.toString()] || 0,
    }));

    res.json({
      projects: projectsWithCounts,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'name email profilePicture contactNumber location')
      .populate('members', 'name email profilePicture');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const applications = await Application.find({ project: project._id })
      .populate('applicant', 'name email profilePicture skills')
      .sort({ createdAt: -1 });

    res.json({ project, applications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProjectStatus = async (req, res) => {
  try {
    const { status, isFeatured, adminNotes } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const prevStatus = project.status;
    if (status) project.status = status;
    if (typeof isFeatured === 'boolean') project.isFeatured = isFeatured;
    if (adminNotes !== undefined) project.adminNotes = adminNotes;

    await project.save();

    await logAudit(
      req.user._id,
      'UPDATE_PROJECT_STATUS',
      'Project',
      project._id,
      project.title,
      { prevStatus, newStatus: project.status, isFeatured: project.isFeatured },
      req
    );

    res.json({ message: 'Project updated successfully', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await Project.findByIdAndDelete(req.params.id);
    await Application.deleteMany({ project: req.params.id });

    await logAudit(
      req.user._id,
      'DELETE_PROJECT',
      'Project',
      req.params.id,
      project.title,
      { creator: project.creator },
      req
    );

    res.json({ message: 'Project and related applications removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== PROPOSALS & BIDS ====================
exports.getProposals = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [proposals, total] = await Promise.all([
      Application.find(filter)
        .populate('project', 'title budget currency status creator')
        .populate('applicant', 'name email profilePicture skills')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Application.countDocuments(filter),
    ]);

    res.json({
      proposals,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProposalStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const application = await Application.findById(req.params.id)
      .populate('project', 'title')
      .populate('applicant', 'name');
    if (!application) return res.status(404).json({ message: 'Proposal not found' });

    const prevStatus = application.status;
    if (status) application.status = status;
    if (adminNotes !== undefined) application.adminNotes = adminNotes;

    await application.save();

    await logAudit(
      req.user._id,
      'UPDATE_PROPOSAL_STATUS',
      'Application',
      application._id,
      `Proposal by ${application.applicant?.name || 'Applicant'}`,
      { prevStatus, newStatus: application.status, project: application.project?.title },
      req
    );

    res.json({ message: 'Proposal status updated successfully', application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== READY-MADE PROJECTS ====================
exports.getReadyMadeProjects = async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [projects, total] = await Promise.all([
      ReadyMadeProject.find(filter)
        .populate('seller', 'name email profilePicture')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      ReadyMadeProject.countDocuments(filter),
    ]);

    res.json({
      projects,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createReadyMadeProject = async (req, res) => {
  try {
    const { title, description, category, price, currency, techStack, demoUrl, githubUrl, downloadUrl, isFeatured } = req.body;
    const project = await ReadyMadeProject.create({
      title,
      description,
      category: category || 'college project',
      price: Number(price) || 0,
      currency: currency || 'INR',
      techStack: Array.isArray(techStack) ? techStack : (techStack || '').split(',').map(s => s.trim()).filter(Boolean),
      demoUrl: demoUrl || '',
      githubUrl: githubUrl || '',
      downloadUrl: downloadUrl || '',
      seller: req.user._id,
      isFeatured: !!isFeatured,
      status: 'approved',
    });

    await logAudit(
      req.user._id,
      'CREATE_READY_MADE_PROJECT',
      'ReadyMadeProject',
      project._id,
      project.title,
      { price: project.price, category: project.category },
      req
    );

    res.status(201).json({ message: 'Ready-made project created successfully', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateReadyMadeProjectStatus = async (req, res) => {
  try {
    const { status, isFeatured, price, adminNotes } = req.body;
    const project = await ReadyMadeProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Ready-made project not found' });

    if (status) project.status = status;
    if (typeof isFeatured === 'boolean') project.isFeatured = isFeatured;
    if (price !== undefined) project.price = Number(price);
    if (adminNotes !== undefined) project.adminNotes = adminNotes;

    await project.save();

    await logAudit(
      req.user._id,
      'UPDATE_READY_MADE_STATUS',
      'ReadyMadeProject',
      project._id,
      project.title,
      { status: project.status, isFeatured: project.isFeatured },
      req
    );

    res.json({ message: 'Ready-made project updated', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteReadyMadeProject = async (req, res) => {
  try {
    const project = await ReadyMadeProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await ReadyMadeProject.findByIdAndDelete(req.params.id);

    await logAudit(
      req.user._id,
      'DELETE_READY_MADE_PROJECT',
      'ReadyMadeProject',
      req.params.id,
      project.title,
      {},
      req
    );

    res.json({ message: 'Ready-made project deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== TRANSACTIONS & PAYMENTS ====================
exports.getTransactions = async (req, res) => {
  try {
    const { type, status, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    if (type && type !== 'all') filter.type = type;
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { gatewayTransactionId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total, summary] = await Promise.all([
      Transaction.find(filter)
        .populate('payer', 'name email')
        .populate('payee', 'name email')
        .populate('project', 'title')
        .populate('readyMadeProject', 'title')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments(filter),
      Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalFees: { $sum: '$platformFee' },
            totalNet: { $sum: '$netAmount' },
          },
        },
      ]),
    ]);

    res.json({
      transactions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      summary: summary[0] || { totalAmount: 0, totalFees: 0, totalNet: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { type, amount, payerEmail, payeeEmail, notes, paymentGateway } = req.body;
    let payer, payee;

    if (payerEmail) payer = await User.findOne({ email: payerEmail.toLowerCase().trim() });
    if (payeeEmail) payee = await User.findOne({ email: payeeEmail.toLowerCase().trim() });

    const settings = (await PlatformSettings.findOne()) || { commissionRate: 10 };
    const numAmount = Number(amount) || 0;
    const platformFee = Math.round((numAmount * (settings.commissionRate / 100)) * 100) / 100;
    const netAmount = numAmount - platformFee;

    const txnId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const transaction = await Transaction.create({
      transactionId: txnId,
      type: type || 'project_payment',
      amount: numAmount,
      platformFee,
      netAmount,
      currency: 'INR',
      status: 'completed',
      payer: payer?._id,
      payee: payee?._id,
      paymentGateway: paymentGateway || 'upi',
      gatewayTransactionId: `UPI-${Date.now()}`,
      notes: notes || 'Admin recorded transaction',
    });

    if (payee) {
      payee.totalEarnings = (payee.totalEarnings || 0) + netAmount;
      payee.walletBalance = (payee.walletBalance || 0) + netAmount;
      await payee.save();
    }
    if (payer) {
      payer.totalSpent = (payer.totalSpent || 0) + numAmount;
      await payer.save();
    }

    await logAudit(
      req.user._id,
      'CREATE_TRANSACTION',
      'Transaction',
      transaction._id,
      txnId,
      { amount: numAmount, type, platformFee },
      req
    );

    res.status(201).json({ message: 'Transaction created successfully', transaction });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== COMMISSIONS ====================
exports.getCommissions = async (req, res) => {
  try {
    const settings = (await PlatformSettings.findOne()) || { commissionRate: 10 };

    const commissionAggregate = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalCommissionEarned: { $sum: '$platformFee' },
          totalGrossVolume: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    // Breakdown by transaction type
    const typeBreakdown = await Transaction.aggregate([
      {
        $group: {
          _id: '$type',
          totalFee: { $sum: '$platformFee' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      commissionRate: settings.commissionRate,
      overview: commissionAggregate[0] || {
        totalCommissionEarned: 0,
        totalGrossVolume: 0,
        totalTransactions: 0,
      },
      typeBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== PAYOUTS ====================
exports.getPayouts = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [payouts, total, pendingTotal] = await Promise.all([
      Payout.find(filter)
        .populate('user', 'name email profilePicture walletBalance')
        .populate('processedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Payout.countDocuments(filter),
      Payout.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      payouts,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      pendingSummary: pendingTotal[0] || { total: 0, count: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePayoutStatus = async (req, res) => {
  try {
    const { status, rejectionReason, transactionRef, adminNotes } = req.body;
    const payout = await Payout.findById(req.params.id).populate('user');
    if (!payout) return res.status(404).json({ message: 'Payout request not found' });

    const prevStatus = payout.status;
    payout.status = status;
    payout.processedBy = req.user._id;
    payout.processedAt = new Date();
    if (rejectionReason) payout.rejectionReason = rejectionReason;
    if (transactionRef) payout.transactionRef = transactionRef;
    if (adminNotes) payout.adminNotes = adminNotes;

    // If approved/completed, create corresponding Transaction record and adjust user wallet
    if (status === 'completed' && prevStatus !== 'completed') {
      const user = await User.findById(payout.user._id);
      if (user) {
        user.walletBalance = Math.max(0, (user.walletBalance || 0) - payout.amount);
        await user.save();
      }

      await Transaction.create({
        transactionId: `TXN-PO-${Date.now()}`,
        type: 'payout',
        amount: payout.amount,
        currency: payout.currency,
        status: 'completed',
        payee: payout.user._id,
        paymentGateway: payout.paymentMethod === 'upi' ? 'upi' : 'bank_transfer',
        gatewayTransactionId: transactionRef || `REF-${Date.now()}`,
        netAmount: payout.amount,
        notes: `Payout withdrawal (${payout.payoutId}) processed to ${payout.paymentMethod}`,
      });
    }

    await payout.save();

    await logAudit(
      req.user._id,
      'UPDATE_PAYOUT_STATUS',
      'Payout',
      payout._id,
      payout.payoutId,
      { prevStatus, newStatus: payout.status, amount: payout.amount, user: payout.user?.name },
      req
    );

    res.json({ message: `Payout marked as ${status}`, payout });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== REFUNDS ====================
exports.processRefund = async (req, res) => {
  try {
    const { transactionId, reason } = req.body;
    const originalTxn = await Transaction.findOne({ transactionId });
    if (!originalTxn) return res.status(404).json({ message: 'Transaction not found' });

    if (originalTxn.status === 'refunded') {
      return res.status(400).json({ message: 'Transaction is already refunded' });
    }

    originalTxn.status = 'refunded';
    await originalTxn.save();

    // Create refund record
    const refundTxn = await Transaction.create({
      transactionId: `TXN-RF-${Date.now()}`,
      type: 'refund',
      amount: originalTxn.amount,
      currency: originalTxn.currency,
      status: 'completed',
      payer: originalTxn.payee,
      payee: originalTxn.payer,
      project: originalTxn.project,
      paymentGateway: originalTxn.paymentGateway,
      netAmount: originalTxn.amount,
      notes: `Refund for ${transactionId}. Reason: ${reason || 'Admin intervention'}`,
    });

    await logAudit(
      req.user._id,
      'PROCESS_REFUND',
      'Transaction',
      originalTxn._id,
      transactionId,
      { amount: originalTxn.amount, reason },
      req
    );

    res.json({ message: 'Refund processed successfully', refundTxn });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== REVIEWS & RATINGS ====================
exports.getReviews = async (req, res) => {
  try {
    const { status, rating, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (rating && rating !== 'all') filter.rating = Number(rating);
    if (search) {
      filter.comment = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('reviewer', 'name email profilePicture')
        .populate('reviewee', 'name email profilePicture')
        .populate('project', 'title')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(filter),
    ]);

    res.json({
      reviews,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const prevStatus = review.status;
    if (status) review.status = status;
    if (adminNotes !== undefined) review.adminNotes = adminNotes;

    await review.save();

    await logAudit(
      req.user._id,
      'UPDATE_REVIEW_STATUS',
      'Review',
      review._id,
      `Rating ${review.rating} Stars`,
      { prevStatus, newStatus: review.status },
      req
    );

    res.json({ message: 'Review status updated', review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    await Review.findByIdAndDelete(req.params.id);

    await logAudit(
      req.user._id,
      'DELETE_REVIEW',
      'Review',
      req.params.id,
      'Deleted review',
      {},
      req
    );

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== COMPLAINTS & TICKETS ====================
exports.getTickets = async (req, res) => {
  try {
    const { status, priority, type, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;
    if (type && type !== 'all') filter.type = type;
    if (search) {
      filter.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('reporter', 'name email profilePicture')
        .populate('reportedUser', 'name email profilePicture')
        .populate('relatedProject', 'title')
        .populate('assignedTo', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Ticket.countDocuments(filter),
    ]);

    res.json({
      tickets,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('reporter', 'name email profilePicture role')
      .populate('reportedUser', 'name email profilePicture role')
      .populate('relatedProject', 'title budget status')
      .populate('assignedTo', 'name email role')
      .populate('responses.sender', 'name email profilePicture role');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.replyTicket = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Reply message is required' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.responses.push({
      sender: req.user._id,
      message,
      isAdmin: true,
      createdAt: new Date(),
    });

    if (ticket.status === 'open') ticket.status = 'in_progress';
    await ticket.save();

    await logAudit(
      req.user._id,
      'REPLY_TICKET',
      'Ticket',
      ticket._id,
      ticket.ticketNumber,
      { messageSnippet: message.slice(0, 100) },
      req
    );

    res.json({ message: 'Reply added successfully', ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTicketStatus = async (req, res) => {
  try {
    const { status, priority, assignedTo, resolution, adminNotes } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const prevStatus = ticket.status;
    if (status) {
      ticket.status = status;
      if (status === 'resolved' || status === 'closed') {
        ticket.resolvedAt = new Date();
      }
    }
    if (priority) ticket.priority = priority;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo || null;
    if (resolution !== undefined) ticket.resolution = resolution;
    if (adminNotes !== undefined) ticket.adminNotes = adminNotes;

    await ticket.save();

    await logAudit(
      req.user._id,
      'UPDATE_TICKET_STATUS',
      'Ticket',
      ticket._id,
      ticket.ticketNumber,
      { prevStatus, newStatus: ticket.status, priority: ticket.priority },
      req
    );

    res.json({ message: 'Ticket updated successfully', ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== ANNOUNCEMENTS ====================
exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, targetAudience, priority, expiresAt } = req.body;
    const announcement = await Announcement.create({
      title,
      message,
      targetAudience: targetAudience || 'all',
      priority: priority || 'info',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.user._id,
      isActive: true,
    });

    await logAudit(
      req.user._id,
      'CREATE_ANNOUNCEMENT',
      'Announcement',
      announcement._id,
      announcement.title,
      { targetAudience: announcement.targetAudience, priority: announcement.priority },
      req
    );

    res.status(201).json({ message: 'Announcement broadcasted', announcement });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const { isActive, title, message, targetAudience, priority } = req.body;
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    if (typeof isActive === 'boolean') announcement.isActive = isActive;
    if (title) announcement.title = title;
    if (message) announcement.message = message;
    if (targetAudience) announcement.targetAudience = targetAudience;
    if (priority) announcement.priority = priority;

    await announcement.save();

    res.json({ message: 'Announcement updated', announcement });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== AUDIT LOGS ====================
exports.getAuditLogs = async (req, res) => {
  try {
    const { action, targetModel, search, page = 1, limit = 25 } = req.query;
    const filter = {};

    if (action && action !== 'all') filter.action = action;
    if (targetModel && targetModel !== 'all') filter.targetModel = targetModel;
    if (search) {
      filter.$or = [
        { targetName: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('admin', 'name email role profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== PLATFORM SETTINGS ====================
exports.getSettings = async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = new PlatformSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();

    await logAudit(
      req.user._id,
      'UPDATE_SETTINGS',
      'PlatformSettings',
      settings._id,
      'Platform Configuration',
      req.body,
      req
    );

    res.json({ message: 'Settings saved successfully', settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== ADMIN ROLES & STAFF ====================
exports.getAdminRoles = async (req, res) => {
  try {
    const adminStaff = await User.find({
      role: { $in: ['admin', 'superadmin', 'moderator', 'support'] },
    }).select('-password');
    res.json(adminStaff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== SEED / INITIALIZE ADMIN DATA ====================
exports.seedAdminData = async (req, res) => {
  try {
    // 1. Ensure caller or default is superadmin
    if (req.user) {
      req.user.role = 'superadmin';
      req.user.status = 'active';
      req.user.isVerified = true;
      await req.user.save();
    }

    // 2. Ensure PlatformSettings exists
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({
        siteName: 'HireMySkills',
        supportEmail: 'support@hiremyskills.com',
        commissionRate: 10,
        minPayoutAmount: 500,
        currency: 'INR',
      });
    }

    // 3. Ensure sample Ready-Made Projects exist if none
    const readyMadeCount = await ReadyMadeProject.countDocuments();
    if (readyMadeCount === 0 && req.user) {
      await ReadyMadeProject.create([
        {
          title: 'Full Stack MERN Freelance Marketplace',
          description: 'Complete freelance platform source code with JWT, Socket.io team chat, project bidding, and admin panel.',
          category: 'webdev',
          price: 2499,
          currency: 'INR',
          techStack: ['React', 'Node.js', 'Express', 'MongoDB', 'Socket.io'],
          demoUrl: 'https://hiremyskills.example.com',
          githubUrl: 'https://github.com/example/freelance-marketplace',
          seller: req.user._id,
          status: 'approved',
          isFeatured: true,
          salesCount: 14,
          rating: 4.9,
          reviewCount: 8,
        },
        {
          title: 'AI Crop Disease Detection & Recommendation System',
          description: 'Deep learning computer vision model built with PyTorch and FastAPI with React web dashboard for farmers.',
          category: 'AI',
          price: 1899,
          currency: 'INR',
          techStack: ['Python', 'PyTorch', 'FastAPI', 'React', 'Tailwind'],
          demoUrl: 'https://crop-ai.example.com',
          githubUrl: 'https://github.com/example/crop-disease-ai',
          seller: req.user._id,
          status: 'approved',
          isFeatured: true,
          salesCount: 22,
          rating: 4.8,
          reviewCount: 12,
        },
        {
          title: 'College Campus Event & Attendance Management App',
          description: 'Flutter cross-platform Android & iOS app with QR code scanning for fast automated campus event registration.',
          category: 'college project',
          price: 1299,
          currency: 'INR',
          techStack: ['Flutter', 'Firebase', 'Dart', 'Cloud Functions'],
          demoUrl: 'https://campus-app.example.com',
          githubUrl: 'https://github.com/example/campus-event-app',
          seller: req.user._id,
          status: 'approved',
          isFeatured: false,
          salesCount: 31,
          rating: 4.7,
          reviewCount: 15,
        },
      ]);
    }

    // 4. Ensure sample Transactions exist if none
    const txnCount = await Transaction.countDocuments();
    if (txnCount === 0 && req.user) {
      await Transaction.create([
        {
          transactionId: 'TXN-90214-5501',
          type: 'project_payment',
          amount: 8500,
          platformFee: 850,
          netAmount: 7650,
          currency: 'INR',
          status: 'completed',
          payee: req.user._id,
          paymentGateway: 'upi',
          gatewayTransactionId: 'UPI-RAZOR-882199',
          notes: 'Client escrow release for Frontend milestone completion',
        },
        {
          transactionId: 'TXN-90214-5502',
          type: 'ready_made_purchase',
          amount: 2499,
          platformFee: 249.9,
          netAmount: 2249.1,
          currency: 'INR',
          status: 'completed',
          payee: req.user._id,
          paymentGateway: 'upi',
          gatewayTransactionId: 'UPI-RAZOR-882200',
          notes: 'Purchase of Full Stack MERN Freelance Marketplace source code',
        },
        {
          transactionId: 'TXN-90214-5503',
          type: 'payout',
          amount: 3500,
          platformFee: 0,
          netAmount: 3500,
          currency: 'INR',
          status: 'completed',
          payee: req.user._id,
          paymentGateway: 'bank_transfer',
          gatewayTransactionId: 'IMPS-HDFC-99120',
          notes: 'Weekly student earnings withdrawal to HDFC Bank',
        },
      ]);
    }

    // 5. Ensure sample Tickets exist if none
    const ticketCount = await Ticket.countDocuments();
    if (ticketCount === 0 && req.user) {
      await Ticket.create([
        {
          ticketNumber: 'TKT-1001',
          reporter: req.user._id,
          type: 'dispute',
          subject: 'Client requested extra revisions beyond project milestone agreement',
          description: 'Client is refusing to approve milestone 2 without 5 additional features that were not specified in the original project proposal.',
          priority: 'high',
          status: 'open',
          responses: [
            {
              sender: req.user._id,
              message: 'Initial dispute raised with project logs and original scope document attached.',
              isAdmin: false,
              createdAt: new Date(),
            },
          ],
        },
        {
          ticketNumber: 'TKT-1002',
          reporter: req.user._id,
          type: 'general_inquiry',
          subject: 'UPI payout verification question',
          description: 'How long does it take for instant UPI withdrawal to reflect in Paytm Payments Bank?',
          priority: 'low',
          status: 'resolved',
          resolution: 'Instant UPI payouts process within 5-15 minutes.',
          resolvedAt: new Date(),
        },
      ]);
    }

    // 6. Ensure sample Announcement exists if none
    const announcementCount = await Announcement.countDocuments();
    if (announcementCount === 0 && req.user) {
      await Announcement.create({
        title: 'Welcome to HireMySkills v2.0 Platform!',
        message: 'New features launched: Instant UPI Payouts, Ready-Made Projects Marketplace, and Enhanced Escrow Protection for students & clients.',
        targetAudience: 'all',
        priority: 'info',
        createdBy: req.user._id,
        isActive: true,
      });
    }

    // 7. Log audit
    await logAudit(
      req.user._id,
      'SEED_ADMIN_DATA',
      'Security',
      req.user._id,
      'System Initialization',
      { status: 'Initialized default admin & sample data' },
      req
    );

    res.json({
      message: 'Admin environment seeded successfully. You are now SuperAdmin!',
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error('seedAdminData error:', error);
    res.status(500).json({ message: error.message });
  }
};
