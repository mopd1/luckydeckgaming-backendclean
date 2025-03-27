// services/gradingService.js
const { Op } = require('sequelize');
const { sequelize, Sequelize, User, PokerHand, PokerHandAction, PlayerGrading } = require('../models');

// Minimum number of hands required before grading
const MINIMUM_HANDS_REQUIRED = 20;

// Calculate scores based on hand history
async function updatePlayerGrading(userId) {
  // Get the total number of hands
  const handCount = await PokerHand.count({
    where: { user_id: userId }
  });
  
  // Skip grading if minimum hand count not reached
  if (handCount < MINIMUM_HANDS_REQUIRED) {
    return null;
  }
  
  // Find or create player grading
  let grading = await PlayerGrading.findOne({
    where: { user_id: userId }
  });
  
  if (!grading) {
    grading = await PlayerGrading.create({
      user_id: userId,
      hands_analyzed: 0
    });
  }
  
  // Calculate scores
  const handSelectionScore = await calculateHandSelectionScore(userId);
  const bettingStrategyScore = await calculateBettingStrategyScore(userId);
  const positionalAwarenessScore = await calculatePositionalAwarenessScore(userId);
  const postFlopDecisionScore = await calculatePostFlopDecisionScore(userId);
  const bluffingEffectivenessScore = await calculateBluffingEffectivenessScore(userId);
  const disciplineScore = await calculateDisciplineScore(userId);
  const opponentAdaptationScore = await calculateOpponentAdaptationScore(userId);
  const bankrollManagementScore = await calculateBankrollManagementScore(userId);
  
  // Calculate overall score (weighted average)
  const weights = {
    handSelection: 0.15,
    bettingStrategy: 0.15,
    positionalAwareness: 0.15,
    postFlopDecision: 0.15,
    bluffingEffectiveness: 0.10,
    discipline: 0.10,
    opponentAdaptation: 0.05,
    bankrollManagement: 0.15
  };
  
  const overallScore = Math.round(
    (handSelectionScore * weights.handSelection) +
    (bettingStrategyScore * weights.bettingStrategy) +
    (positionalAwarenessScore * weights.positionalAwareness) +
    (postFlopDecisionScore * weights.postFlopDecision) +
    (bluffingEffectivenessScore * weights.bluffingEffectiveness) +
    (disciplineScore * weights.discipline) +
    (opponentAdaptationScore * weights.opponentAdaptation) +
    (bankrollManagementScore * weights.bankrollManagement)
  );
  
  // Update grading
  await grading.update({
    overall_score: overallScore,
    hand_selection_score: handSelectionScore,
    betting_strategy_score: bettingStrategyScore,
    positional_awareness_score: positionalAwarenessScore,
    post_flop_decision_score: postFlopDecisionScore,
    bluffing_effectiveness_score: bluffingEffectivenessScore,
    discipline_score: disciplineScore,
    opponent_adaptation_score: opponentAdaptationScore,
    bankroll_management_score: bankrollManagementScore,
    hands_analyzed: handCount
  });
  
  return grading;
}

// Example implementation of one scoring function
async function calculateHandSelectionScore(userId) {
  // Get hands with position and preflop action info
  const hands = await PokerHand.findAll({
    where: { 
      user_id: userId,
      position: { [Op.ne]: null },
      preflop_action: { [Op.ne]: null }
    },
    order: [['played_at', 'DESC']],
    limit: 200 // Focus on most recent hands
  });
  
  if (hands.length < MINIMUM_HANDS_REQUIRED) {
    return 50; // Default score
  }
  
  let points = 0;
  let decisions = 0;
  
  for (const hand of hands) {
    // Analyze starting hand quality vs position and action
    const premiumHand = isHandPremium(hand.player_cards);
    const weakHand = isHandWeak(hand.player_cards);
    const earlyPosition = hand.position === 'early';
    const latePosition = hand.position === 'late';
    const folded = hand.preflop_action === 'fold';
    const raised = hand.preflop_action === 'raise';
    
    if (premiumHand) {
      if (folded) {
        points -= 10; // Bad fold of a premium hand
      } else if (raised) {
        points += 5; // Good raise with a premium hand
      }
      decisions++;
    } else if (weakHand) {
      if (earlyPosition && folded) {
        points += 3; // Good fold of weak hand in early position
      } else if (earlyPosition && !folded) {
        points -= 5; // Bad call/raise with weak hand in early position
      } else if (latePosition && !folded && hand.result === 'won') {
        points += 5; // Successfully played weak
      } else if (latePosition && !folded && hand.result === 'won') {
        points += 5; // Successfully played weak hand in position
      }
      decisions++;
    } else {
      // Moderate hands are position-dependent
      if (earlyPosition && !folded) {
        points -= 2; // Should usually fold these in early position
      } else if (latePosition && folded) {
        points -= 1; // Should often play these in late position
      }
      decisions++;
    }
  }
  
  // Calculate final score (50 is baseline)
  let score = 50;
  if (decisions > 0) {
    score = Math.max(0, Math.min(100, 50 + (points / decisions) * 10));
  }
  
  return Math.round(score);
}

// Helper functions for hand analysis
function isHandPremium(cards) {
  // Parse the cards if they're in string format
  const parsedCards = typeof cards === 'string' ? JSON.parse(cards) : cards;
  
  // Check if pair
  if (parsedCards[0].rank === parsedCards[1].rank) {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const rankValue = ranks.indexOf(parsedCards[0].rank);
    // Pairs of tens or higher are premium
    return rankValue >= 8;  // 8 = Ten
  }
  
  // Check if high suited cards
  if (parsedCards[0].suit === parsedCards[1].suit) {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const rank1 = ranks.indexOf(parsedCards[0].rank);
    const rank2 = ranks.indexOf(parsedCards[1].rank);
    // A-K, A-Q, K-Q suited
    return (rank1 >= 11 && rank2 >= 10) || (rank1 >= 12 && rank2 >= 9);
  }
  
  // Check for high unsuited cards
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const rank1 = ranks.indexOf(parsedCards[0].rank);
  const rank2 = ranks.indexOf(parsedCards[1].rank);
  // Only A-K unsuited is premium
  return (rank1 === 12 && rank2 === 13) || (rank1 === 13 && rank2 === 12);
}

function isHandWeak(cards) {
  // Parse the cards if they're in string format
  const parsedCards = typeof cards === 'string' ? JSON.parse(cards) : cards;
  
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const rank1 = ranks.indexOf(parsedCards[0].rank);
  const rank2 = ranks.indexOf(parsedCards[1].rank);
  
  // Offsuit low cards
  if (parsedCards[0].suit !== parsedCards[1].suit) {
    // Both cards are 9 or lower
    if (rank1 < 7 && rank2 < 7) {
      return true;
    }
    
    // Low card with medium gap (e.g., 72o, 83o)
    if (Math.abs(rank1 - rank2) > 3 && (rank1 < 5 || rank2 < 5)) {
      return true;
    }
  }
  
  // Even suited low cards with big gap are weak
  if (parsedCards[0].suit === parsedCards[1].suit) {
    if (Math.abs(rank1 - rank2) > 4 && (rank1 < 5 && rank2 < 5)) {
      return true;
    }
  }
  
  return false;
}

// Stub implementations for other scoring functions
// These would need to be implemented with similar logic to calculateHandSelectionScore
async function calculateBettingStrategyScore(userId) {
  // Analyze bet sizing, value bets, and bluffs
  return 50; // Default implementation
}

async function calculatePositionalAwarenessScore(userId) {
  // Analyze play by position (early, middle, late, blinds)
  return 50; // Default implementation
}

async function calculatePostFlopDecisionScore(userId) {
  // Analyze post-flop decision quality
  return 50; // Default implementation
}

async function calculateBluffingEffectivenessScore(userId) {
  // Analyze bluff frequency and success rate
  return 50; // Default implementation
}

async function calculateDisciplineScore(userId) {
  // Analyze discipline in tough spots
  return 50; // Default implementation
}

async function calculateOpponentAdaptationScore(userId) {
  // Analyze adaptation to different opponents
  return 50; // Default implementation
}

async function calculateBankrollManagementScore(userId) {
  // Get buyin data from poker hands
  const hands = await PokerHand.findAll({
    where: { 
      user_id: userId,
      total_balance_before_buyin: { [Op.ne]: null },
      buyin_amount: { [Op.ne]: null }
    },
    order: [['played_at', 'DESC']],
    limit: 100 // Focus on most recent hands
  });
  
  if (hands.length < 10) { // Need fewer hands for this metric
    return 50; // Default score
  }
  
  let buyinPercentages = [];
  
  for (const hand of hands) {
    if (hand.total_balance_before_buyin > 0) {
      const percentage = (hand.buyin_amount / hand.total_balance_before_buyin) * 100;
      buyinPercentages.push(percentage);
    }
  }
  
  if (buyinPercentages.length === 0) {
    return 50; // Default score
  }
  
  // Calculate average buyin percentage
  const avgBuyinPercentage = buyinPercentages.reduce((sum, val) => sum + val, 0) / buyinPercentages.length;
  
  // Calculate variance (consistency)
  const variance = calculateVariance(buyinPercentages);
  
  // Score based on optimal range (5-10%)
  let percentageScore = 0;
  if (avgBuyinPercentage < 1) {
    // Too conservative
    percentageScore = 60 - Math.min(30, (1 - avgBuyinPercentage) * 20);
  } else if (avgBuyinPercentage >= 1 && avgBuyinPercentage < 5) {
    // Somewhat conservative
    percentageScore = 80 - ((5 - avgBuyinPercentage) / 4) * 20;
  } else if (avgBuyinPercentage >= 5 && avgBuyinPercentage <= 10) {
    // Optimal range
    percentageScore = 100 - ((avgBuyinPercentage - 5) / 5) * 10;
  } else if (avgBuyinPercentage > 10 && avgBuyinPercentage <= 20) {
    // Somewhat aggressive
    percentageScore = 90 - ((avgBuyinPercentage - 10) / 10) * 30;
  } else {
    // Too aggressive
    percentageScore = 60 - Math.min(40, (avgBuyinPercentage - 20) / 2);
  }
  
  // Calculate consistency score
  const consistencyScore = Math.max(20, 100 - Math.sqrt(variance) * 5);
  
  // Combine scores
  const score = Math.round((percentageScore * 0.7) + (consistencyScore * 0.3));
  
  return Math.max(0, Math.min(100, score));
}

// Helper function to calculate variance
function calculateVariance(values) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return variance;
}

module.exports = {
  updatePlayerGrading,
  MINIMUM_HANDS_REQUIRED
};
