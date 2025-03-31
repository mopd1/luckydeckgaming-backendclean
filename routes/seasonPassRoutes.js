const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  SeasonPass, 
  SeasonMilestone, 
  UserSeasonProgress, 
  UserInventory,
  User,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

/**
 * Get the current active season pass with user progress
 */
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the current date in UTC
    const now = new Date();
    
    // Find the active season pass
    const activeSeason = await SeasonPass.findOne({
      where: {
        start_date: { [Op.lte]: now },
        end_date: { [Op.gt]: now },
        is_active: true
      }
    });
    
    if (!activeSeason) {
      return res.status(404).json({ 
        error: 'No active season pass found',
        message: 'There is no active season pass at this time'
      });
    }
    
    // Find or create user progress for this season
    const [userProgress, created] = await UserSeasonProgress.findOrCreate({
      where: {
        user_id: userId,
        season_id: activeSeason.season_id
      },
      defaults: {
        has_inside_track: false,
        claimed_milestones: []
      }
    });
    
    // Get user's current action points
    const user = await User.findByPk(userId);
    
    // Calculate end time in user-friendly format
    const endDate = new Date(activeSeason.end_date);
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    // Parse claimed_milestones if it's a string
    let finalClaimedMilestones = []; // Default to empty array
    if (userProgress.claimed_milestones) { // Check if it exists
        if (typeof userProgress.claimed_milestones === 'string') {
            try {
                const parsed = JSON.parse(userProgress.claimed_milestones);
                // Ensure the parsed result is actually an array
                if (Array.isArray(parsed)) {
                    finalClaimedMilestones = parsed;
                } else {
                     console.warn(`Parsed claimed_milestones for user ${userId}, season ${activeSeason.season_id} but result was not an array:`, parsed);
                     // Keep finalClaimedMilestones as []
                }
            } catch (parseError) {
                console.error(`Failed to parse claimed_milestones JSON for user ${userId}, season ${activeSeason.season_id}:`, userProgress.claimed_milestones, parseError);
                // Keep finalClaimedMilestones as []
            }
        } else if (Array.isArray(userProgress.claimed_milestones)) {
            // It's already an array (e.g., from defaults or JSON DB type)
            finalClaimedMilestones = userProgress.claimed_milestones;
        }
        // If it's null or some other type, it stays []
    }
    
    res.json({
      season: {
        id: activeSeason.season_id,
        name: activeSeason.name,
        description: activeSeason.description,
        start_date: activeSeason.start_date,
        end_date: activeSeason.end_date,
        days_remaining: daysRemaining
      },
      user_progress: {
        action_points: user?.action_points || 0, // Use optional chaining and default
        has_inside_track: userProgress.has_inside_track,
        claimed_milestones: finalClaimedMilestones // <-- Send the processed array
      }
    });
  } catch (error) {
    console.error('Error fetching current season pass:', error);
    res.status(500).json({ error: 'Failed to fetch season pass data' });
  }
});

/**
 * Get all milestones for the current season
 */
router.get('/milestones', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the current date in UTC
    const now = new Date();
    
    // Find the active season pass
    const activeSeason = await SeasonPass.findOne({
      where: {
        start_date: { [Op.lte]: now },
        end_date: { [Op.gt]: now },
        is_active: true
      }
    });
    
    if (!activeSeason) {
      // Return empty array if no active season, as requested by Godot script
      return res.json({ season_id: null, milestones: [] });
    }
    
    // Get all milestones for the season
    const milestones = await SeasonMilestone.findAll({
      where: {
        season_id: activeSeason.season_id,
        is_active: true
      },
      order: [['milestone_number', 'ASC']]
    });
    
    // Get user progress
    const userProgress = await UserSeasonProgress.findOne({
      where: {
        user_id: userId,
        season_id: activeSeason.season_id
      }
    });
    
    // Parse claimed_milestones if it's a string
    let claimedMilestoneNumbers = []; // Default empty array
    if (userProgress && userProgress.claimed_milestones) {
        if (typeof userProgress.claimed_milestones === 'string') {
            try {
                const parsed = JSON.parse(userProgress.claimed_milestones);
                if (Array.isArray(parsed)) {
                    claimedMilestoneNumbers = parsed;
                } else {
                     console.warn(`Parsed claimed_milestones in /milestones for user ${userId}, season ${activeSeason.season_id} but result was not an array:`, parsed);
                }
            } catch (e) {
                console.error("Error parsing claimed_milestones in /milestones route:", e);
            }
        } else if (Array.isArray(userProgress.claimed_milestones)) {
            claimedMilestoneNumbers = userProgress.claimed_milestones;
        }
    }

    // Format milestones with claimed status
    const formattedMilestones = milestones.map(milestone => {
      // Use the processed claimedMilestoneNumbers array
      const isClaimed = claimedMilestoneNumbers.includes(milestone.milestone_number);

      return {
        milestone_number: milestone.milestone_number,
        required_points: milestone.required_points,
        free_reward: {
          type: milestone.free_reward_type,
          amount: milestone.free_reward_amount
        },
        paid_reward: {
          type: milestone.paid_reward_type,
          amount: milestone.paid_reward_amount
        },
        is_claimed: isClaimed // Make sure this is sent if Godot expects it
      };
    });

    res.json({
      season_id: activeSeason.season_id,
      milestones: formattedMilestones // Send the array nested in 'milestones' key
    });
  } catch (error) {
    console.error('Error fetching season milestones:', error);
    res.status(500).json({ error: 'Failed to fetch season milestones' });
  }
});

/**
 * Claim a milestone reward
 */
router.post('/claim-milestone', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const { milestone_number } = req.body;
    
    if (!milestone_number) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Milestone number is required' });
    }
    
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
      await transaction.rollback();
      return res.status(404).json({ error: 'No active season pass found' });
    }
    
    // Find the milestone
    const milestone = await SeasonMilestone.findOne({
      where: {
        season_id: activeSeason.season_id,
        milestone_number: milestone_number,
        is_active: true
      },
      transaction
    });
    
    if (!milestone) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    // Get user progress
    const userProgress = await UserSeasonProgress.findOne({
      where: {
        user_id: userId,
        season_id: activeSeason.season_id
      },
      transaction
    });
    
    if (!userProgress) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User progress not found' });
    }
    
    // Check if milestone is already claimed
    if (userProgress.claimed_milestones.includes(milestone_number)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Milestone already claimed' });
    }
    
    // Get user and check if they have enough action points
    const user = await User.findByPk(userId, { transaction });
    
    if (user.action_points < milestone.required_points) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Not enough action points',
        required: milestone.required_points,
        current: user.action_points
      });
    }
    
    // Determine which reward to give
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
        const [inventoryItem, created] = await UserInventory.findOrCreate({
          where: {
            user_id: userId,
            item_type: 'pack',
            item_id: rewardAmount.toString() // Pack ID stored in amount
          },
          defaults: {
            quantity: 1,
            metadata: { 
              source: 'season_pass',
              milestone: milestone_number,
              season_id: activeSeason.season_id
            }
          },
          transaction
        });
        
        if (!created) {
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
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Unknown reward type', 
          type: rewardType 
        });
    }
    
    // Update claimed milestones
    userProgress.claimed_milestones = [
      ...userProgress.claimed_milestones, 
      milestone_number
    ];
    await userProgress.save({ transaction });
    
    // Commit transaction
    await transaction.commit();
    
    res.json({
      success: true,
      milestone: milestone_number,
      reward: rewardResult
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error claiming milestone:', error);
    res.status(500).json({ error: 'Failed to claim milestone' });
  }
});

/**
 * Purchase the Inside Track (Premium Pass)
 */
router.post('/purchase-inside-track', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const { gems_cost = 500 } = req.body;  // Default cost is 500 gems
    
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
      await transaction.rollback();
      return res.status(404).json({ error: 'No active season pass found' });
    }
    
    // Get user progress
    const userProgress = await UserSeasonProgress.findOne({
      where: {
        user_id: userId,
        season_id: activeSeason.season_id
      },
      transaction
    });
    
    if (!userProgress) {
      await transaction.rollback();
      return res.status(404).json({ error: 'User progress not found' });
    }
    
    // Check if user already has inside track
    if (userProgress.has_inside_track) {
      await transaction.rollback();
      return res.status(400).json({ error: 'You already have the Inside Track for this season' });
    }
    
    // Get user to check gems balance
    const user = await User.findByPk(userId, { transaction });
    
    // Check if user has enough gems
    if (user.gems < gems_cost) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Not enough gems',
        required: gems_cost,
        current: user.gems
      });
    }
    
    // Deduct gems
    await user.decrement('gems', { by: gems_cost, transaction });
    
    // Grant inside track access
    userProgress.has_inside_track = true;
    await userProgress.save({ transaction });
    
    // Commit transaction
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Inside Track purchased successfully',
      season_id: activeSeason.season_id,
      remaining_gems: user.gems - gems_cost
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error purchasing Inside Track:', error);
    res.status(500).json({ error: 'Failed to purchase Inside Track' });
  }
});

/**
 * Get user's inventory
 */
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const inventory = await UserInventory.findAll({
      where: { user_id: userId },
      attributes: ['item_type', 'item_id', 'quantity', 'metadata']
    });
    
    // Group by item type for easier client handling
    const groupedInventory = inventory.reduce((acc, item) => {
      if (!acc[item.item_type]) {
        acc[item.item_type] = [];
      }
      
      acc[item.item_type].push({
        id: item.item_id,
        quantity: item.quantity,
        metadata: item.metadata
      });
      
      return acc;
    }, {});
    
    res.json(groupedInventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

/**
 * Use an item from inventory (like opening a pack)
 */
router.post('/inventory/use', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const { item_type, item_id } = req.body;
    
    if (!item_type || !item_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Item type and ID are required' });
    }
    
    // Check if item exists in inventory
    const inventoryItem = await UserInventory.findOne({
      where: {
        user_id: userId,
        item_type,
        item_id
      },
      transaction
    });
    
    if (!inventoryItem || inventoryItem.quantity <= 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Item not found in inventory or quantity is 0' });
    }
    
    // Process different item types
    let result = {};
    
    if (item_type === 'pack') {
      // Handle pack opening
      // This is where you would determine what's in the pack and add it to user's ownership
      
      // For now, let's simulate giving random avatar parts
      const user = await User.findByPk(userId, { transaction });
      
      // Convert to array if it's a string
      let parts = user.owned_avatar_parts;
      if (typeof parts === 'string') {
        try { parts = JSON.parse(parts); } 
        catch (e) { parts = []; }
      }
      
      if (!Array.isArray(parts)) {
        parts = [];
      }
      
      // Simulate adding 3 random avatar parts (IDs 1-20)
      const newParts = [];
      for (let i = 0; i < 3; i++) {
        const partId = Math.floor(Math.random() * 20) + 1;
        if (!parts.includes(partId.toString())) {
          parts.push(partId.toString());
          newParts.push(partId);
        }
      }
      
      user.owned_avatar_parts = parts;
      await user.save({ transaction });
      
      result = {
        pack_id: item_id,
        awarded_parts: newParts
      };
    } else {
      await transaction.rollback();
      return res.status(400).json({ error: 'Unsupported item type: ' + item_type });
    }
    
    // Decrement item quantity
    await inventoryItem.decrement('quantity', { by: 1, transaction });
    
    // If quantity reaches 0, delete the item
    if (inventoryItem.quantity <= 1) {
      await inventoryItem.destroy({ transaction });
    }
    
    // Commit transaction
    await transaction.commit();
    
    res.json({
      success: true,
      item_used: {
        type: item_type,
        id: item_id
      },
      result
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error using inventory item:', error);
    res.status(500).json({ error: 'Failed to use inventory item' });
  }
});

module.exports = router;
