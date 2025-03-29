const { 
  User,
  SeasonPass,
  SeasonMilestone,
  UserSeasonProgress,
  UserInventory,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

/**
 * Check if user has unlocked any season pass milestones
 * This function should be called whenever a user's action points are updated
 * @param {number} userId - User ID
 * @param {number} actionPoints - Current action points
 * @returns {Promise<Array>} - Array of processed milestones
 */
async function checkSeasonPassProgress(userId, actionPoints) {
  const transaction = await sequelize.transaction();
  
  try {
    // Get the current date in UTC
    const now = new Date();
    
    // Find the active season pass
    const activeSeason = await SeasonPass.findOne({
      where: {
        start_date: { [Op.lte]: now },
        end_date: { [Op.gt]: now },
        is_active: true
      },
      transaction
    });
    
    if (!activeSeason) {
      await transaction.commit();
      return []; // No active season
    }
    
    // Find or create user progress
    const [userProgress, created] = await UserSeasonProgress.findOrCreate({
      where: {
        user_id: userId,
        season_id: activeSeason.season_id
      },
      defaults: {
        has_inside_track: false,
        claimed_milestones: []
      },
      transaction
    });
    
    // Get all claimable milestones that user hasn't claimed yet
    const milestones = await SeasonMilestone.findAll({
      where: {
        season_id: activeSeason.season_id,
        required_points: { [Op.lte]: actionPoints },
        milestone_number: {
          [Op.notIn]: userProgress.claimed_milestones
        },
        is_active: true
      },
      order: [['milestone_number', 'ASC']],
      transaction
    });
    
    if (milestones.length === 0) {
      await transaction.commit();
      return []; // No milestones to claim
    }
    
    // Process all claimable milestones
    const user = await User.findByPk(userId, { transaction });
    const claimedMilestones = [];
    
    for (const milestone of milestones) {
      const rewardType = userProgress.has_inside_track ? 
        milestone.paid_reward_type : milestone.free_reward_type;
        
      const rewardAmount = userProgress.has_inside_track ? 
        milestone.paid_reward_amount : milestone.free_reward_amount;
      
      // Apply the reward
      let rewardResult = null;
      
      switch (rewardType) {
        case 'chips':
        case 'balance':
          // Update user's balance
          await user.increment('balance', { 
            by: rewardAmount, 
            transaction 
          });
          rewardResult = { type: 'balance', amount: rewardAmount };
          break;
          
        case 'gems':
          // Update user's gems
          await user.increment('gems', { 
            by: rewardAmount, 
            transaction 
          });
          rewardResult = { type: 'gems', amount: rewardAmount };
          break;
          
        case 'pack':
          // Add pack to user's inventory
          const [inventoryItem, itemCreated] = await UserInventory.findOrCreate({
            where: {
              user_id: userId,
              item_type: 'pack',
              item_id: rewardAmount.toString() // Pack ID stored in amount
            },
            defaults: {
              quantity: 1,
              metadata: { 
                source: 'season_pass',
                milestone: milestone.milestone_number,
                season_id: activeSeason.season_id
              }
            },
            transaction
          });
          
          if (!itemCreated) {
            // Increment quantity if already exists
            await inventoryItem.increment('quantity', { 
              by: 1, 
              transaction 
            });
          }
          
          rewardResult = { 
            type: 'pack', 
            pack_id: rewardAmount.toString(),
            quantity: 1
          };
          break;
          
        case 'avatar_part':
          // Add to owned parts (assumes parts are stored in JSON array)
          if (!user.owned_avatar_parts) {
            user.owned_avatar_parts = [];
          }
          
          // Convert to array if it's a string
          let parts = user.owned_avatar_parts;
          if (typeof parts === 'string') {
            try {
              parts = JSON.parse(parts);
            } catch (e) {
              parts = [];
            }
          }
          
          if (!Array.isArray(parts)) {
            parts = [];
          }
          
          // Add the part if not already owned
          if (!parts.includes(rewardAmount.toString())) {
            parts.push(rewardAmount.toString());
            user.owned_avatar_parts = parts;
            await user.save({ transaction });
          }
          
          rewardResult = { 
            type: 'avatar_part', 
            part_id: rewardAmount.toString() 
          };
          break;
          
        default:
          console.error(`Unknown reward type: ${rewardType}`);
          continue; // Skip this milestone
      }
      
      // Add this milestone to claimed list
      claimedMilestones.push({
        milestone_number: milestone.milestone_number,
        reward: rewardResult
      });
    }
    
    // Update claimed milestones in user progress
    if (claimedMilestones.length > 0) {
      const claimedNumbers = claimedMilestones.map(m => m.milestone_number);
      userProgress.claimed_milestones = [
        ...userProgress.claimed_milestones,
        ...claimedNumbers
      ];
      await userProgress.save({ transaction });
    }
    
    // Commit transaction
    await transaction.commit();
    
    return claimedMilestones;
  } catch (error) {
    await transaction.rollback();
    console.error('Error checking season pass progress:', error);
    return [];
  }
}

module.exports = {
  checkSeasonPassProgress
};
