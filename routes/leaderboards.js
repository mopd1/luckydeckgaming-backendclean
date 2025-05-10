const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../models');
const { User, DailyLeaderboard } = db;
const { Op } = require('sequelize');
const { cacheMiddleware, clearCache } = require('../middleware/cache');

// Get daily leaderboard data with 2-minute cache
router.get('/daily/:type', authenticateToken, cacheMiddleware(120), async (req, res) => {
  try {
    const { type } = req.params;
    
    // Validate leaderboard type
    const validTypes = ['action_points', 'poker_winnings', 'blackjack_winnings', 'slot_winnings'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid leaderboard type' });
    }
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Query for top 10 users in this leaderboard for today
    const leaderboardData = await DailyLeaderboard.findAll({
      where: {
        leaderboard_type: type,
        date_period: today
      },
      order: [['score', 'DESC']],
      limit: 10,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'display_name']
      }]
    });
    
    // Format the data for response
    const formattedData = leaderboardData.map((entry, index) => ({
      rank: index + 1,
      user_id: entry.user_id,
      username: entry.user.display_name || entry.user.username,
      score: entry.score,
      prize: index < 3 ? ['briefcase_pack', 'holdall_pack', 'envelope_pack'][index] : null
    }));
    
    // Find current user's position if they're not in top 10
    if (!formattedData.some(entry => entry.user_id === req.user.id)) {
      const userEntry = await DailyLeaderboard.findOne({
        where: {
          user_id: req.user.id,
          leaderboard_type: type,
          date_period: today
        }
      });
      
      if (userEntry) {
        // Count how many users have higher scores
        const higherScores = await DailyLeaderboard.count({
          where: {
            leaderboard_type: type,
            date_period: today,
            score: { [Op.gt]: userEntry.score }
          }
        });
        
        formattedData.push({
          rank: higherScores + 1,
          user_id: req.user.id,
          username: req.user.display_name || req.user.username,
          score: userEntry.score,
          prize: higherScores < 3 ? ['briefcase_pack', 'holdall_pack', 'envelope_pack'][higherScores] : null,
          is_current_user: true
        });
      } else {
        // User doesn't have an entry yet
        formattedData.push({
          rank: null,
          user_id: req.user.id,
          username: req.user.display_name || req.user.username,
          score: 0,
          prize: null,
          is_current_user: true
        });
      }
    } else {
      // Mark current user in the top 10
      const userIndex = formattedData.findIndex(entry => entry.user_id === req.user.id);
      if (userIndex !== -1) {
        formattedData[userIndex].is_current_user = true;
      }
    }
    
    return res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Internal API to update a user's score on a leaderboard
router.post('/daily/update', authenticateToken, async (req, res) => {
  try {
    const { user_id, leaderboard_type, score_change } = req.body;
    
    // Validate inputs
    if (!user_id || !leaderboard_type || score_change === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const validTypes = ['action_points', 'poker_winnings', 'blackjack_winnings', 'slot_winnings'];
    if (!validTypes.includes(leaderboard_type)) {
      return res.status(400).json({ error: 'Invalid leaderboard type' });
    }
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Find or create the leaderboard entry for this user
    const [entry, created] = await DailyLeaderboard.findOrCreate({
      where: {
        user_id,
        leaderboard_type,
        date_period: today
      },
      defaults: {
        score: score_change
      }
    });
    
    // If entry already exists, update the score
    if (!created) {
      entry.score = entry.score + score_change;
      await entry.save();
    }
    
    // Clear relevant leaderboard caches
    await clearCache(`/daily/${leaderboard_type}`);
    
    return res.status(200).json({ 
      success: true, 
      user_id, 
      leaderboard_type, 
      new_score: entry.score 
    });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
