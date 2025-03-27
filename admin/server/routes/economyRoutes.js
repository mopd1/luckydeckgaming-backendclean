// server/routes/economyRoutes.js
const express = require('express');
const router = express.Router();
const { User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/userAuth');

// Get economy stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get today's date (midnight CET)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    // Adjust for CET (UTC+1)
    today.setUTCHours(today.getUTCHours() - 1);

    // Get user stats (total chips, flash, averages)
    const userStats = await User.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('balance')), 'total_chips'],
        [sequelize.fn('SUM', sequelize.col('gems')), 'total_flash'],
        [sequelize.fn('AVG', sequelize.col('balance')), 'avg_chips'],
        [sequelize.fn('AVG', sequelize.col('gems')), 'avg_flash'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'user_count']
      ],
      raw: true
    });

    // Get rake generated today
    const rakeToday = await sequelize.query(`
      SELECT SUM(rake) as total_rake
      FROM poker_hands
      WHERE played_at >= '${today.toISOString().split('T')[0]}'
    `, { type: sequelize.QueryTypes.SELECT });

    // Get blackjack house profit today (sum of initial_bet minus sum of payout)
    const blackjackProfit = await sequelize.query(`
      SELECT SUM(initial_bet) - SUM(payout) as house_profit
      FROM BlackjackHands
      WHERE played_at >= '${today.toISOString().split('T')[0]}'
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      economy: {
        total_chips: parseInt(userStats[0].total_chips) || 0,
        total_flash: parseInt(userStats[0].total_flash) || 0,
        avg_chips: parseInt(userStats[0].avg_chips) || 0,
        avg_flash: parseInt(userStats[0].avg_flash) || 0,
        user_count: parseInt(userStats[0].user_count) || 0,
        rake_today: parseInt(rakeToday[0].total_rake) || 0,
        blackjack_profit_today: parseInt(blackjackProfit[0].house_profit) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching economy stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch economy stats', 
      error: error.message 
    });
  }
});

module.exports = router;
