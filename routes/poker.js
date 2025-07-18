const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');  // Import specific function
const db = require('../models');
const gradingService = require('../services/gradingService'); // Import grading service
const tableManager = require('../services/tableManager');

// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'Poker route is working' });
});


// Record a completed poker hand
router.post('/record-hand', authenticateToken, function(req, res) {
  const userId = req.user.id;
  const {
    tableId,
    handNumber,
    stakeLevel,
    gameType,
    playerCards,
    communityCards,
    potSize,
    handStrength,
    result,
    chipsWon,
    rake,
    rakeEligible,
    potBeforeRake,
    // New fields for grading
    position,
    preflopAction,
    stackSizeBefore,
    roundsPlayed,
    totalBalanceBeforeBuyin,
    buyinAmount
  } = req.body;

  console.log('Recording poker hand for user:', userId);
  console.log('Hand data:', req.body);

  db.PokerHand.create({
    user_id: userId,
    table_id: tableId,
    hand_number: handNumber,
    stake_level: stakeLevel,
    game_type: gameType || 'texas_holdem',
    player_cards: JSON.stringify(playerCards),
    community_cards: JSON.stringify(communityCards),
    pot_size: potSize,
    hand_strength: handStrength,
    result: result,
    chips_won: chipsWon,
    rake: rake || 0,
    rake_eligible: rakeEligible || false,
    pot_before_rake: potBeforeRake || potSize, // Default to pot size if not provided
    // New fields for grading
    position: position,
    preflop_action: preflopAction,
    stack_size_before: stackSizeBefore,
    rounds_played: roundsPlayed,
    total_balance_before_buyin: totalBalanceBeforeBuyin,
    buyin_amount: buyinAmount
  })
  .then(async hand => {
    // Update leaderboard data if the player won chips
    if (chipsWon > 0) {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Find or create today's leaderboard entry for poker winnings
        const [leaderboardEntry, created] = await db.DailyLeaderboard.findOrCreate({
          where: {
            user_id: userId,
            leaderboard_type: 'poker_winnings',
            date_period: today
          },
          defaults: {
            score: chipsWon
          }
        });
        
        // If entry already exists, update the score
        if (!created) {
          leaderboardEntry.score += chipsWon;
          await leaderboardEntry.save();
        }
        
        console.log(`[LEADERBOARD] Updated poker_winnings leaderboard for user ${userId}. New score: ${leaderboardEntry.score}`);
      } catch (leaderboardError) {
        // Log error but don't fail the main request
        console.error('[LEADERBOARD] Error updating poker_winnings leaderboard:', leaderboardError);
      }
    }

    res.status(201).json({
      success: true,
      data: hand
    });

    // Log before triggering grading update
    console.log(`Triggering grading update for user ${userId} after hand recording`);
    
    // Trigger background grading update after recording the hand
    gradingService.updatePlayerGrading(userId)
      .then(updatedGrading => {
        console.log(`Updated grading for user ${userId}:`, updatedGrading);
      })
      .catch(error => {
        console.error(`Error updating grading for user ${userId}:`, error);
      });
  })
  .catch(error => {
    console.error('Error recording poker hand:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record poker hand'
    });
  });
});

// Record a poker hand action
router.post('/record-action', authenticateToken, function(req, res) {
  const userId = req.user.id;
  const {
    handId,
    bettingRound,
    position,
    actionType,
    amount,
    potSizeBefore,
    opponentActionBefore,
    handStrength
  } = req.body;

  console.log('Recording poker hand action for user:', userId);
  console.log('Action data:', req.body);

  db.PokerHandAction.create({
    hand_id: handId,
    user_id: userId,
    betting_round: bettingRound,
    position: position,
    action_type: actionType,
    amount: amount,
    pot_size_before: potSizeBefore,
    opponent_action_before: opponentActionBefore,
    hand_strength: handStrength,
    action_timestamp: new Date()
  })
  .then(action => {
    res.status(201).json({
      success: true,
      data: action
    });
  })
  .catch(error => {
    console.error('Error recording poker hand action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record poker hand action'
    });
  });
});

// Get user poker hand history
router.get('/history', authenticateToken, function(req, res) {
  const userId = req.user.id;
  const {
    startDate,
    endDate,
    stakeLevel,
    gameType,
    result,
    limit = 50,
    offset = 0
  } = req.query;

  // Build query conditions
  const where = { user_id: userId };

  if (stakeLevel) where.stake_level = stakeLevel;
  if (gameType) where.game_type = gameType;
  if (result) where.result = result;

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
  db.PokerHand.findAndCountAll({
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
    console.error('Error fetching poker hand history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch poker hand history'
    });
  });
});

// Get actions for a specific hand
router.get('/hand/:handId/actions', authenticateToken, function(req, res) {
  const userId = req.user.id;
  const handId = req.params.handId;

  // First verify the hand belongs to this user
  db.PokerHand.findOne({
    where: {
      id: handId,
      user_id: userId
    }
  })
  .then(hand => {
    if (!hand) {
      return res.status(404).json({
        success: false,
        error: 'Hand not found or you do not have permission to view it'
      });
    }

    // Fetch the actions for this hand
    return db.PokerHandAction.findAll({
      where: { hand_id: handId },
      order: [['action_timestamp', 'ASC']]
    });
  })
  .then(actions => {
    if (!actions) return; // This handles the case where the previous block returned early

    res.status(200).json({
      success: true,
      count: actions.length,
      data: actions
    });
  })
  .catch(error => {
    console.error('Error fetching hand actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hand actions'
    });
  });
});

// Manually trigger grading update
router.post('/update-grading', authenticateToken, function(req, res) {
  const userId = req.user.id;

  gradingService.updatePlayerGrading(userId)
    .then(grading => {
      if (!grading) {
        return res.status(400).json({
          success: false,
          error: `Not enough hands played. Need at least ${gradingService.MINIMUM_HANDS_REQUIRED} hands.`
        });
      }

      res.status(200).json({
        success: true,
        message: 'Grading updated successfully',
        data: grading
      });
    })
    .catch(error => {
      console.error('Error updating player grading:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update player grading'
      });
    });
});

// Get available tables for a stake level
router.get('/tables/:stakeLevel', authenticateToken, async function(req, res) {
    try {
        const stakeLevel = parseInt(req.params.stakeLevel);
        const tables = await tableManager.getTableList(stakeLevel);
        
        res.json({
            success: true,
            stakeLevel: stakeLevel,
            tables: tables
        });
    } catch (error) {
        console.error('Error getting tables:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get tables'
        });
    }
});

// Join a table (find available seat)
router.post('/join-table', authenticateToken, async function(req, res) {
    try {
        const userId = req.user.id;
        const { stakeLevel, buyinAmount } = req.body;
        
        if (!stakeLevel || !buyinAmount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: stakeLevel, buyinAmount'
            });
        }

        // Find or create table
        const tableInfo = await tableManager.findOrCreateTable(stakeLevel, userId);
        
        if (!tableInfo) {
            return res.status(404).json({
                success: false,
                error: 'No available tables'
            });
        }

        // Assign seat to player
        const seatAssignment = await tableManager.assignSeatToPlayer(
            tableInfo.tableId, 
            userId, 
            req.user.username || `User${userId}`, 
            buyinAmount
        );

        if (!seatAssignment.success) {
            return res.status(400).json({
                success: false,
                error: seatAssignment.error
            });
        }

        res.json({
            success: true,
            tableId: tableInfo.tableId,
            seatIndex: seatAssignment.seatIndex,
            stakeLevel: tableInfo.stakeLevel,
            message: 'Successfully joined table'
        });

    } catch (error) {
        console.error('Error joining table:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join table'
        });
    }
});

// Get table info
router.get('/table/:tableId', authenticateToken, async function(req, res) {
    try {
        const tableId = req.params.tableId;
        const tablePattern = `poker:table:*:${tableId}`;
        const tableKeys = await redisClient.keys(tablePattern);
        
        if (tableKeys.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Table not found'
            });
        }

        const tableData = await redisClient.get(tableKeys[0]);
        const table = JSON.parse(tableData);

        res.json({
            success: true,
            table: {
                tableId: table.tableId,
                stakeLevel: table.stakeLevel,
                gamePhase: table.gamePhase,
                playerCount: tableManager.countHumanPlayers(table),
                smallBlind: table.smallBlind,
                bigBlind: table.bigBlind
            }
        });

    } catch (error) {
        console.error('Error getting table info:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get table info'
        });
    }
});

module.exports = router;
