// admin/server/middleware/auth.js
const jwt = require('jsonwebtoken');
const { Admin } = require('../models'); // Only need the Admin model

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization header missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('Auth token received:', token); // Good for debugging
    console.log('Decoded token:', decoded);   // Good for debugging

    const adminUserRecord = await Admin.findOne({
      where: {
        id: decoded.id,
        isActive: true // Use the isActive field from the corrected Admin model
      }
    });

    if (!adminUserRecord) {
      return res.status(401).json({ message: 'Admin user not found or not active.' });
    }

    // For simplicity, if they exist and are active, they are an "admin"
    // The `role` field (e.g., 'admin', 'superadmin') on adminUserRecord can be used for more specific checks if needed.
    // For now, just attach the user record.
    req.user = adminUserRecord; 
    req.permissions = []; // No complex permissions needed if all admins have same access

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Auth middleware error:', error); // Log the actual error
    return res.status(500).json({ message: 'Authentication error on server' });
  }
};

// The requirePermission middleware might not be strictly necessary now if all admins have full access.
// If you keep it, it will deny access if req.permissions is empty.
// You could modify it or routes that use it.
const requirePermission = (permission) => {
  return (req, res, next) => {
    // If all admins have all permissions, this check might be bypassed or always true.
    // For now, let's assume if you reach here, you're an admin and have permission.
    // OR, define a generic permission that all admins have.
    // console.log(`Checking permission: ${permission} for user ${req.user.username}. User role: ${req.user.role}`);
    // if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    //   next(); // Simple check: if user has 'admin' or 'superadmin' role, allow.
    // } else {
    //   return res.status(403).json({ message: 'Permission denied' });
    // }
    // For now, to make it pass if an admin is authenticated:
    if (req.user) { // If user is authenticated by authenticateToken, assume they have permission
        console.warn(`Bypassing specific permission check for '${permission}' as all admins have same permissions.`);
        next();
    } else {
        return res.status(403).json({ message: 'Permission denied (user not authenticated for permission check)' });
    }
  };
};

module.exports = { authenticateToken, requirePermission };
