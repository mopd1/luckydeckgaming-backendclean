// Authentication middleware using the users table
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization header missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Look up the user in the actual users table
    const user = await User.findOne({
      where: { 
        id: decoded.id,
        is_active: true 
      },
      attributes: { exclude: ['password'] } // Don't send password
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Add user info to the request
    req.user = user;

    // Set permissions based on admin_role or is_admin
    if (user.is_admin) {
      let permissions = [
        'view_dashboard', 
        'view_users', 
        'manage_users', 
        'update_balance'
      ];

      // Add additional permissions based on role
      if (user.admin_role === 'super_admin' || user.admin_role === 'admin') {
        permissions = permissions.concat([
          'view_database',
          'execute_sql',
          'view_config',
          'manage_config'
        ]);
      }

      req.permissions = permissions;
    } else {
      req.permissions = [];
    }

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
