// routes/blackjack.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../models');

// Record a completed blackjack hand
router.post('/record-hand', authenticateToken, function(req, res) {
  const userId = req.user.id;
  const {
    tableId,
    handNumber,
    stakeLevel,
    playerCards,
    dealerCards,
    splitHands,
    initialBet,
    insuranceBet,
    outcome,
    payout,
    doubled,
    surrendered,
    split,
    optimalPlay,
    runningCount,
    trueCount,
    streakMultiplierApplied,
    streakCount
  } = req.body;

  console.log('Recording blackjack hand for user:', userId);
  console.log('Hand data:', req.body);

  db.BlackjackHand.create({
    user_id: userId,
    table_id: tableId,
    hand_number: handNumber,
    stake_level: stakeLevel,
    player_cards: JSON.stringify(playerCards),
    dealer_cards: JSON.stringify(dealerCards),
    initial_bet: initialBet,
    insurance_bet: insuranceBet || 0,
    outcome: outcome,
    payout: payout,
    doubled: doubled || false,
    surrendered: surrendered || false,
    split: split || false,
    optimal_play: optimalPlay !== undefined ? optimalPlay : true,
    running_count: runningCount || 0,
    true_count: trueCount || 0,
    streak_multiplier_applied: streakMultiplierApplied || false,
    streak_count: streakCount || 0,
    played_at: new Date()
  })
  .then(hand => {
    res.status(201).json({
      success: true,
      data: hand
    });
  })
  .catch(error => {
    console.error('Error recording blackjack hand:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record blackjack hand'
    });
  });
});

// Get user blackjack hand history
router.get('/history', authenticateToken, function(req, res) {
  const userId = req.user.id;
  const {
    startDate,
    endDate,
    stakeLevel,
    outcome,
    limit = 50,
    offset = 0
  } = req.query;

  // Build query conditions
  const where = { user_id: userId };

  if (stakeLevel) where.stake_level = stakeLevel;
  if (outcome) where.outcome = outcome;

  if (startDate && endDate) {
    where.played_at = {
      [db.sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
    };
  } else if (startDate) {
    where.played_at = {
      [db.sequelize.Op.gte]: new Date(startDate)
    };
  } else if (endDate) {
    where.played_at = {
      [db.sequelize.Op.lte]: new Date(endDate)
    };
  }

  // Get hands
  db.BlackjackHand.findAndCountAll({
    where,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['played_at', 'DESC']]
  })
  .then(hands => {
    res.status(200).json({
      success: true,
      count: hands.count,
      data: hands.rows
    });
  })
  .catch(error => {
    console.error('Error fetching blackjack hand history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blackjack hand history'
    });
  });
});

module.exports = router;
