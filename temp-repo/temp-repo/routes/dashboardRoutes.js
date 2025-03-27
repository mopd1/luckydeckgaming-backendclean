// admin/server/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();

// Get dashboard stats
router.get('/stats', (req, res) => {
  // Return mock stats for now
  res.json({
    userStats: {
      total_users: 125,
      active_users: 87,
      new_users_today: 7,
      logins_today: 15
    },
    balanceStats: {
      total_chips: 15000000,
      avg_chips: 120000,
      max_chips: 1000000
    },
    transactionStats: {
      total_transactions: 450,
      transactions_today: 32
    }
  });
});

// Get recent activities
router.get('/activities', (req, res) => {
  // Return mock activities for now
  res.json({
    recentLogins: [
      { id: 1, username: 'user1', display_name: 'User One', last_login: new Date() },
      { id: 2, username: 'user2', display_name: 'User Two', last_login: new Date() }
    ],
    recentTransactions: [
      { id: 101, user_id: 1, username: 'user1', display_name: 'User One', amount: 1000, type: 'add', created_at: new Date() },
      { id: 102, user_id: 2, username: 'user2', display_name: 'User Two', amount: 500, type: 'subtract', created_at: new Date() }
    ],
    newUsers: [
      { id: 3, username: 'user3', display_name: 'User Three', created_at: new Date() },
      { id: 4, username: 'user4', display_name: 'User Four', created_at: new Date() }
    ]
  });
});

module.exports = router;
