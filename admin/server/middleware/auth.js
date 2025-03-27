// admin/server/middleware/auth.js
const jwt = require('jsonwebtoken');
const { AdminUser, AdminRole, AdminPermission } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization header missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const adminUser = await AdminUser.findOne({
      where: { id: decoded.id, is_active: true },
      include: [{
        model: AdminRole,
        as: 'role',
        include: [{
          model: AdminPermission,
          as: 'permissions'
        }]
      }]
    });

    if (!adminUser) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Add user and permissions to request
    req.user = adminUser;
    req.permissions = adminUser.role?.permissions?.map(p => p.permission_name) || [];
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.permissions || !req.permissions.includes(permission)) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    next();
  };
};

module.exports = { authenticateToken, requirePermission };
