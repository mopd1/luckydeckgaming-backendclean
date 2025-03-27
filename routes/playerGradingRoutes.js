// routes/playerGradingRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { User, PlayerGrading, PokerHand } = require('../models');

// Get player's grading
router.get('/my-grading', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get player grading or create if it doesn't exist
    let grading = await PlayerGrading.findOne({
      where: { user_id: userId }
    });
    
    if (!grading) {
      grading = await PlayerGrading.create({
        user_id: userId,
        hands_analyzed: 0,
        privacy_settings: {
          show_overall_score: true,
          show_category_scores: true,
          show_hands_played: true,
          show_win_rate: true
        }
      });
    }
    
    // Get hand count for context
    const handCount = await PokerHand.count({
      where: { user_id: userId }
    });
    
    res.json({
      success: true,
      data: {
        grading,
        handCount,
        minimumHandsRequired: 20, // We decided on 20 hands minimum
        isVisible: handCount >= 20
      }
    });
  } catch (error) {
    console.error('Error fetching player grading:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player grading'
    });
  }
});

// Reset player's grading
router.post('/reset-grading', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get player grading
    let grading = await PlayerGrading.findOne({
      where: { user_id: userId }
    });
    
    if (!grading) {
      return res.status(404).json({
        success: false,
        error: 'Player grading not found'
      });
    }
    
    // Check if reset is allowed (once per week)
    const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    if (grading.last_reset_time && (new Date() - new Date(grading.last_reset_time)) < oneWeek) {
      return res.status(400).json({
        success: false,
        error: 'You can only reset your grading once per week',
        nextResetDate: new Date(new Date(grading.last_reset_time).getTime() + oneWeek)
      });
    }
    
    // Reset scores but increment reset counter
    await grading.update({
      overall_score: null,
      hand_selection_score: null,
      betting_strategy_score: null,
      positional_awareness_score: null,
      post_flop_decision_score: null,
      bluffing_effectiveness_score: null,
      discipline_score: null,
      opponent_adaptation_score: null,
      bankroll_management_score: null,
      hands_analyzed: 0,
      last_reset_time: new Date(),
      reset_count: grading.reset_count + 1
    });
    
    res.json({
      success: true,
      message: 'Grading reset successfully',
      data: grading
    });
  } catch (error) {
    console.error('Error resetting player grading:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset player grading'
    });
  }
});

// Update privacy settings
router.put('/privacy-settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { privacySettings } = req.body;
    
    if (!privacySettings) {
      return res.status(400).json({
        success: false,
        error: 'Privacy settings are required'
      });
    }
    
    // Get player grading
    let grading = await PlayerGrading.findOne({
      where: { user_id: userId }
    });
    
    if (!grading) {
      return res.status(404).json({
        success: false,
        error: 'Player grading not found'
      });
    }
    
    // Update privacy settings
    await grading.update({
      privacy_settings: privacySettings
    });
    
    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: grading
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update privacy settings'
    });
  }
});

// Get another player's visible grading
router.get('/player/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    
    // Get player grading
    const grading = await PlayerGrading.findOne({
      where: { user_id: targetUserId }
    });
    
    if (!grading) {
      return res.status(404).json({
        success: false,
        error: 'Player grading not found'
      });
    }
    
    // Check privacy settings
    const privacySettings = grading.privacy_settings;
    
    // Count hands
    const handCount = await PokerHand.count({
      where: { user_id: targetUserId }
    });
    
    // Calculate win rate
    const winningHands = await PokerHand.count({
      where: { 
        user_id: targetUserId,
        result: 'won'
      }
    });
    
    const winRate = handCount > 0 ? (winningHands / handCount) * 100 : 0;
    
    // Apply privacy filters and minimum hands requirement
    const publicData = {
      user_id: grading.user_id,
      hands_analyzed: grading.hands_analyzed,
      handCount,
      isVisible: handCount >= 20
    };
    
    if (handCount >= 20) {
      if (privacySettings.show_overall_score) {
        publicData.overall_score = grading.overall_score;
      }
      
      if (privacySettings.show_category_scores) {
        // Return only the top 3 scores
        const scores = [
          { name: 'Hand Selection', score: grading.hand_selection_score },
          { name: 'Betting Strategy', score: grading.betting_strategy_score },
          { name: 'Positional Awareness', score: grading.positional_awareness_score },
          { name: 'Post-Flop Decision', score: grading.post_flop_decision_score },
          { name: 'Bluffing Effectiveness', score: grading.bluffing_effectiveness_score },
          { name: 'Discipline', score: grading.discipline_score },
          { name: 'Opponent Adaptation', score: grading.opponent_adaptation_score },
          { name: 'Bankroll Management', score: grading.bankroll_management_score }
        ].filter(item => item.score !== null);
        
        // Sort by score descending and take top 3
        publicData.top_skills = scores
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
      }
      
      if (privacySettings.show_hands_played) {
        publicData.handCount = handCount;
      }
      
      if (privacySettings.show_win_rate) {
        publicData.winRate = winRate.toFixed(1);
      }
    }
    
    res.json({
      success: true,
      data: publicData
    });
  } catch (error) {
    console.error('Error fetching player grading:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player grading'
    });
  }
});

module.exports = router;
