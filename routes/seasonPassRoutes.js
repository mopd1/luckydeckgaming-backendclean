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

console.log("!!! --- Loading seasonPassRoutes.js --- !!!");

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
        
      case 'envelope_pack':
      case 'holdall_pack':
      case 'briefcase_pack':
        // Add pack to user's inventory
        // Always create a new row for each pack instance
        // The auto-incrementing 'id' will be its unique identifier
        await UserInventory.create({
            user_id: userId,
            item_type: 'pack', // Use a generic type 'pack'
            item_id: rewardType, // Store the specific type (e.g., 'envelope_pack') here
            quantity: 1, // Always quantity 1 for a unique instance
            metadata: {
              source: 'season_pass',
              milestone: milestone_number,
              season_id: activeSeason.season_id
              // Add any other useful info like pack name if needed
            }
          },
          { transaction } // Pass the transaction object
        );

        // The rewardResult can maybe just indicate the type granted
        // The client won't know the instance ID until the next inventory fetch
        rewardResult = {
          type: rewardType, // Still useful to know what kind was granted
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
 * Get user's inventory (Modified for Unique Instances)
 */
router.get('/inventory', authenticateToken, async (req, res) => {
  console.log("!!! --- Executing NEW GET /inventory handler --- !!!");
  try {
    const userId = req.user.id;
    console.log(`!!! --- Fetching inventory for user: ${userId} --- !!!`);

    const inventoryItems = await UserInventory.findAll({
      where: { user_id: userId },
      attributes: ['id', 'item_type', 'item_id', 'quantity', 'metadata', 'created_at']
    });
    console.log(`!!! --- Found ${inventoryItems.length} raw items --- !!!`);

// Prepare the flat array response
const responseInventory = inventoryItems.map(item => {
  // --- START REVISED CHECK ---
  // Check if it's a NEW format pack OR an OLD format pack type
  const isPack = item.item_type === 'pack' || // Check for new format
                 item.item_type === 'envelope_pack' || // Check for old formats
                 item.item_type === 'holdall_pack' ||
                 item.item_type === 'briefcase_pack';

  if (isPack) {
    // It's a pack (either new or old format)

    // Determine the actual pack type ID.
    // If it's new format ('pack'), the type is in item_id.
    // If it's old format ('envelope_pack'), the type is in item_type.
    const packTypeId = (item.item_type === 'pack') ? item.item_id : item.item_type;

    return {
      instance_id: item.id,         // USE THE DATABASE ROW ID (e.g., 9)
      item_type: 'pack',            // Standardize output type to 'pack'
      pack_type_id: packTypeId,     // Output the specific type ('envelope_pack')
      quantity: item.quantity,      // Should be 1
      metadata: item.metadata,      // Pass metadata through
      created_at: item.created_at   // Pass timestamp through
    };
  } else {
    // Format OTHER item types (non-packs)
    return {
      id: item.item_id,           // Assuming non-packs use item_id as identifier
      item_type: item.item_type,
      quantity: item.quantity,
      metadata: item.metadata
    };
  }
  // --- END REVISED CHECK ---
}); // End of .map()

console.log(`!!! --- Mapped inventory (REVISED CHECK): ${JSON.stringify(responseInventory)} --- !!!`); // Verify the final array

res.json(responseInventory); // Send the correctly mapped array

  } catch (error) {
    console.error('!!! --- ERROR in NEW GET /inventory handler: --- !!!');
    console.error("Error Stack:", error.stack);
    console.error('Original Error Object:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

/**
 * Open a specific pack instance
 */
router.post('/inventory/packs/:instanceId/open', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction(); // Start transaction

  try {
    const userId = req.user.id;
    const instanceId = parseInt(req.params.instanceId, 10); // Get ID from URL param

    if (isNaN(instanceId)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid pack instance ID format.' });
    }

    // 1. Find the specific pack instance row using PRIMARY KEY 'id'
    const packInstance = await UserInventory.findOne({
      where: {
        id: instanceId,       // Use the primary key 'id'
        user_id: userId,
        item_type: 'pack'     // Ensure it's a pack item
        // quantity: { [Op.gt]: 0 } // Optional: Ensure quantity is positive (should be 1)
      },
      transaction
    });

    // 2. Check if the pack exists and belongs to the user
    if (!packInstance) {
      await transaction.rollback();
      // 404 Not Found implies it doesn't exist or was already opened
      return res.status(404).json({ error: 'Pack instance not found or already opened.' });
    }

    // 3. Get pack type to determine rewards
    const packTypeId = packInstance.item_id; // e.g., 'envelope_pack'

    // 4. Delete the pack instance row FIRST
    await packInstance.destroy({ transaction }); // Or UserInventory.destroy(...)

    // 5. Generate and grant rewards based on packTypeId
    const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) {
        // Should not happen if token is valid, but safety check
        await transaction.rollback();
        return res.status(404).json({ error: 'User not found during reward granting.' });
    }

    let grantedRewards = { items: [], currency: {} }; // Structure to hold rewards

    // --- REWARD GENERATION LOGIC ---
    // Replace this switch with your actual, potentially more complex, reward logic
    // This logic should ideally live in a separate utility function for cleanliness
    switch (packTypeId) {
      case 'envelope_pack':
        const chipsEnvelope = 1000 + Math.floor(Math.random() * 5000);
        await user.increment('balance', { by: chipsEnvelope, transaction });
        grantedRewards.currency['chips'] = (grantedRewards.currency['chips'] || 0) + chipsEnvelope;

        if (Math.random() < 0.3) { // 30% chance for gems
          const gemsEnvelope = 5 + Math.floor(Math.random() * 20);
          await user.increment('gems', { by: gemsEnvelope, transaction });
          grantedRewards.currency['gems'] = (grantedRewards.currency['gems'] || 0) + gemsEnvelope;
        }
        break;

      case 'holdall_pack':
        const chipsHoldall = 5000 + Math.floor(Math.random() * 15000);
        await user.increment('balance', { by: chipsHoldall, transaction });
        grantedRewards.currency['chips'] = (grantedRewards.currency['chips'] || 0) + chipsHoldall;

        const gemsHoldall = 20 + Math.floor(Math.random() * 50);
        await user.increment('gems', { by: gemsHoldall, transaction });
        grantedRewards.currency['gems'] = (grantedRewards.currency['gems'] || 0) + gemsHoldall;

        if (Math.random() < 0.5) { // 50% chance for avatar part
            const partIdHoldall = (Math.floor(Math.random() * 20) + 1).toString(); // Example part ID
            // Add to owned_avatar_parts (handle JSON parsing/adding carefully)
            let ownedPartsHoldall = user.owned_avatar_parts || [];
            if (typeof ownedPartsHoldall === 'string') { try { ownedPartsHoldall = JSON.parse(ownedPartsHoldall); } catch(e){ ownedPartsHoldall = []; } }
            if (!Array.isArray(ownedPartsHoldall)) ownedPartsHoldall = [];
            if (!ownedPartsHoldall.includes(partIdHoldall)) {
                ownedPartsHoldall.push(partIdHoldall);
                user.owned_avatar_parts = ownedPartsHoldall; // Assign back (Sequelize handles JSON stringify on save)
                grantedRewards.items.push({ item_type: 'avatar_part', item_id: partIdHoldall, quantity: 1 });
            }
        }
        break;

      case 'briefcase_pack':
        const chipsBriefcase = 20000 + Math.floor(Math.random() * 50000);
        await user.increment('balance', { by: chipsBriefcase, transaction });
        grantedRewards.currency['chips'] = (grantedRewards.currency['chips'] || 0) + chipsBriefcase;

        const gemsBriefcase = 50 + Math.floor(Math.random() * 150);
        await user.increment('gems', { by: gemsBriefcase, transaction });
        grantedRewards.currency['gems'] = (grantedRewards.currency['gems'] || 0) + gemsBriefcase;

        const partIdBriefcase = (Math.floor(Math.random() * 20) + 1).toString(); // Example part ID
         // Add to owned_avatar_parts
         let ownedPartsBriefcase = user.owned_avatar_parts || [];
         if (typeof ownedPartsBriefcase === 'string') { try { ownedPartsBriefcase = JSON.parse(ownedPartsBriefcase); } catch(e){ ownedPartsBriefcase = []; } }
         if (!Array.isArray(ownedPartsBriefcase)) ownedPartsBriefcase = [];
         if (!ownedPartsBriefcase.includes(partIdBriefcase)) {
             ownedPartsBriefcase.push(partIdBriefcase);
             user.owned_avatar_parts = ownedPartsBriefcase;
             grantedRewards.items.push({ item_type: 'avatar_part', item_id: partIdBriefcase, quantity: 1 });
         }
        break;

      default:
        console.warn(`Unknown pack type ID encountered: ${packTypeId} for instance ${instanceId}`);
        // Decide if this is an error or just grants nothing
        // await transaction.rollback(); // Optionally rollback if type is unknown
        // return res.status(400).json({ error: `Unknown pack type: ${packTypeId}` });
    }
    // --- END REWARD GENERATION LOGIC ---

    // Save user changes (balance, gems, owned_parts)
    await user.save({ transaction });

    // 6. Commit transaction
    await transaction.commit();

    // 7. Send success response with granted rewards
    res.json({
      success: true,
      message: `Successfully opened ${packTypeId}.`,
      opened_pack_instance_id: instanceId,
      rewards: grantedRewards // Send the calculated rewards back to the client
    });

  } catch (error) {
    // Rollback transaction in case of any error
    await transaction.rollback();
    console.error(`Error opening pack instance ${req.params.instanceId}:`, error);
    res.status(500).json({ error: 'Failed to open pack.' });
  }
});

console.log("!!! --- Finished loading seasonPassRoutes.js --- !!!");

module.exports = router;
