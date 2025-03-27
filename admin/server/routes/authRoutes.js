// admin/server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/userAuth');

// Login endpoint that works with the users table
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { username, password } = req.body;
    
    // For backwards compatibility, still allow the hardcoded admin account
    if (username === 'admin' && password === 'admin123') {
      // Generate JWT token
      const token = jwt.sign(
        { id: 1, username: username, role: 'admin' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '8h' }
      );
      
      // Include all permissions for admin
      const permissions = [
        'view_dashboard', 
        'view_users', 
        'manage_users', 
        'update_balance', 
        'view_database', 
        'execute_sql', 
        'view_config', 
        'manage_config'
      ];
      
      return res.json({
        success: true,
        token,
        user: {
          id: 1,
          username: username,
          role: 'admin',
          permissions: permissions
        }
      });
    }
    
    // Otherwise, check the actual users table
    const user = await User.findOne({
      where: { 
        username: username,
        is_active: true,
        is_admin: true  // Only admin users can log in
      }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password (if using bcrypt)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid && password !== user.password) { // Also allow plain text match for testing
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.admin_role || 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );
    
    // Determine permissions based on role
    let permissions = [
      'view_dashboard', 
      'view_users', 
      'manage_users', 
      'update_balance'
    ];
    
    if (user.admin_role === 'super_admin' || user.admin_role === 'admin') {
      permissions = permissions.concat([
        'view_database',
        'execute_sql',
        'view_config',
        'manage_config'
      ]);
    }
    
    // Update last login time
    await user.update({
      last_login: new Date(),
      failed_login_attempts: 0
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.admin_role || 'admin',
        permissions: permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get current user info
router.get('/me', authenticateToken, (req, res) => {
  try {
    res.json({
      id: req.user.id,
      username: req.user.username,
      role: req.user.admin_role || 'admin',
      permissions: req.permissions
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
