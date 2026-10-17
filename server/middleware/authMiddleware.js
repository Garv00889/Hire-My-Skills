const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (req.user.status === 'banned' || req.user.status === 'suspended') {
      return res.status(403).json({ message: `Your account is ${req.user.status}. Please contact support.` });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Check if user has an administrative role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const allowedRoles = ['admin', 'superadmin', 'moderator', 'support'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: Administrator privileges required' });
  }

  next();
};

// Check if user is SuperAdmin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied: SuperAdmin privileges required' });
  }
  next();
};

// Check for specific admin permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role === 'superadmin' || req.user.role === 'admin') {
      return next();
    }

    // Default to true for administrative staff (moderator/support) unless permission is explicitly disabled
    if (
      (req.user.role === 'moderator' || req.user.role === 'support') &&
      (!req.user.adminPermissions || req.user.adminPermissions[permission] !== false)
    ) {
      return next();
    }

    if (req.user.adminPermissions && req.user.adminPermissions[permission]) {
      return next();
    }

    return res.status(403).json({
      message: `Access denied: Missing permission '${permission}'`,
    });
  };
};

module.exports = {
  protect,
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
};
