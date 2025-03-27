// admin/server/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/userAuth');

// Get dashboard stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.count();
    
    // Get active users
    const activeUsers = await User.count({
      where: {
        is_active: true
      }
    });
    
    // Get new users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newUsersToday = await User.count({
      where: {
        created_at: {
          [Op.gte]: today
        }
      }
    });
    
    // Get logins today
    const loginsToday = await User.count({
      where: {
        last_login: {
          [Op.gte]: today
        }
      }
    });
    
    // Get balance stats
    const balanceStats = await User.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('balance')), 'total_chips'],
        [sequelize.fn('AVG', sequelize.col('balance')), 'avg_chips'],
        [sequelize.fn('MAX', sequelize.col('balance')), 'max_chips']
      ],
      raw: true
    });
    
    res.json({
      userStats: {
        total_users: totalUsers,
        active_users: activeUsers,
        new_users_today: newUsersToday,
        logins_today: loginsToday
      },
      balanceStats: {
        total_chips: parseInt(balanceStats[0].total_chips) || 0,
        avg_chips: parseInt(balanceStats[0].avg_chips) || 0,
        max_chips: parseInt(balanceStats[0].max_chips) || 0
      },
      transactionStats: {
        // For now, we don't have transaction data in our model
        // Will be replaced with actual data when transaction model is available
        total_transactions: 0,
        transactions_today: 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard stats', 
      error: error.message 
    });
  }
});

// Get recent activities
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    // Get recent logins (10 most recent)
    const recentLogins = await User.findAll({
      where: {
        last_login: {
          [Op.ne]: null
        }
      },
      attributes: ['id', 'username', 'display_name', 'last_login'],
      order: [['last_login', 'DESC']],
      limit: 10,
      raw: true
    });
    
    // Get new users (10 most recent)
    const newUsers = await User.findAll({
      attributes: ['id', 'username', 'display_name', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 10,
      raw: true
    });
    
    // For transactions, we currently don't have a transaction model
    // This will be updated when a transaction model is added
    // For now, we'll return an empty array
    const recentTransactions = [];
    
    res.json({
      recentLogins,
      recentTransactions,
      newUsers
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ 
      message: 'Failed to fetch activities', 
      error: error.message 
    });
  }
});

module.exports = router;
