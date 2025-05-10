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
const fs = require('fs');
const path = require('path');
const { cacheMiddleware, clearCache } = require('../middleware/cache');

console.log("!!! --- Loading seasonPassRoutes.js --- !!!");

let availableAvatarParts = [];
try {
    // Construct the correct path relative to the routes file
    const avatarPartsDataPath = path.join(__dirname, '../data/avatar_parts_store.json');
    console.log(`Attempting to load avatar parts from: ${avatarPartsDataPath}`);
    const partsJson = fs.readFileSync(avatarPartsDataPath, 'utf8');
    const partsData = JSON.parse(partsJson);
    if (partsData && Array.isArray(partsData.parts)) {
        availableAvatarParts = partsData.parts;
        console.log(`Successfully loaded ${availableAvatarParts.length} avatar parts for reward generation.`);
    } else {
        console.error('Invalid format in avatar_parts_store.json. Expected { "parts": [...] }');
    }
} catch (err) {
    console.error('!!! CRITICAL ERROR: Failed to load avatar_parts_store.json !!!', err);
    // Decide how to handle this - maybe disable pack opening or throw?
    // For now, availableAvatarParts will remain empty, preventing avatar rewards.
}

/**
 * Get the current active season pass with user progress - cache for 5 minutes
 */
router.get('/current', authenticateToken, cacheMiddleware(300), async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Use the same query as in claim-milestone
    const activeSeason = await SeasonPass.findOne({
      where: {
        start_date: { [Op.lte]: now },
        end_date: { [Op.gt]: now },
        is_active: true
      }
    });

    if (!activeSeason) {
      return res.status(404).json({ error: "No active season pass found" });
    }

    // *** Directly fetch using findOne with raw: true ***
    const userProgressRaw = await UserSeasonProgress.findOne({
        where: { user_id: userId, season_id: activeSeason.season_id },
        attributes: ['has_inside_track', 'claimed_milestones'],
        raw: true // Get plain data object directly
    });

    console.log(`GET /current: Fetched userProgressRaw directly: ${JSON.stringify(userProgressRaw)}`);

    // If null, maybe the user record *just* got created and isn't visible yet?
    // This is unlikely but could happen in extreme race conditions. Respond with defaults.
    if (!userProgressRaw) {
        console.warn(`GET /current: UserSeasonProgress for user ${userId}, season ${activeSeason.season_id} not found immediately after potential creation. Returning defaults.`);
         // You could try findOrCreate here again as a fallback if needed, but let's see if direct findOne works first
         // const [userProgress, created] = await UserSeasonProgress.findOrCreate({ ... });
         // ... then parse userProgress.claimed_milestones ...
         // For now, return defaults:
          const user = await User.findByPk(userId, { attributes: ['action_points'], raw: true });
          res.json({
              season: { /* ... season data ... */ },
              user_progress: {
                  action_points: user?.action_points || 0,
                  has_inside_track: false,
                  claimed_milestones: []
              }
          });
         return;
    }

    // Fetch User separately
    const user = await User.findByPk(userId, { attributes: ['action_points'], raw: true });

    const endDate = new Date(activeSeason.end_date);
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    // Parse claimed_milestones from the raw data object
    let finalClaimedMilestones = [];
    let rawClaimed = userProgressRaw.claimed_milestones; // Access directly

    if (rawClaimed) { /* ... (same parsing logic as before) ... */ }

    res.json({
      season: { /* ... */ },
      user_progress: {
        action_points: user?.action_points || 0,
        has_inside_track: userProgressRaw.has_inside_track ?? false,
        claimed_milestones: finalClaimedMilestones
      }
    });
  } catch (error) {
    console.error('Error fetching current season pass:', error);
    res.status(500).json({ error: 'Failed to fetch season pass data' });
  }
});

/**
 * Get all milestones for the current season - cache for 30 minutes
 */
router.get('/milestones', authenticateToken, cacheMiddleware(1800), async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Use the same query as in claim-milestone
    const activeSeason = await SeasonPass.findOne({
      where: {
        start_date: { [Op.lte]: now },
        end_date: { [Op.gt]: now },
        is_active: true
      }
    });
    
    if (!activeSeason) { 
      return res.json({ season_id: null, milestones: [] }); 
    }

    // Add specific where clause for milestones
    const milestones = await SeasonMilestone.findAll({ 
      where: { 
        season_id: activeSeason.season_id,
        is_active: true
      }, 
      order: [['milestone_number', 'ASC']] 
    });

    // *** Directly fetch using findOne with raw: true ***
    const userProgressRaw = await UserSeasonProgress.findOne({
        where: { user_id: userId, season_id: activeSeason.season_id },
        attributes: ['claimed_milestones'],
        raw: true // Get plain data object directly
    });
    console.log(`GET /milestones: Fetched userProgressRaw directly: ${JSON.stringify(userProgressRaw)}`);

    // Parse claimed_milestones from the raw data object
    let claimedMilestoneNumbers = [];
    // Handle case where userProgressRaw might be null if record doesn't exist yet
    if (userProgressRaw && userProgressRaw.claimed_milestones) {
        let rawClaimed = userProgressRaw.claimed_milestones;
        
        // FIX: Properly parse the claimed_milestones
        if (rawClaimed) {
            if (typeof rawClaimed === 'string') {
                try {
                    const parsed = JSON.parse(rawClaimed);
                    if (Array.isArray(parsed)) {
                        claimedMilestoneNumbers = parsed;
                        console.log(`Successfully parsed claimed_milestones string: ${rawClaimed} into array: ${JSON.stringify(claimedMilestoneNumbers)}`);
                    } else {
                        console.warn(`Parsed claimed_milestones not an array: ${JSON.stringify(parsed)}`);
                    }
                } catch (e) {
                    console.error(`Error parsing claimed_milestones: ${rawClaimed}`, e);
                }
            } else if (Array.isArray(rawClaimed)) {
                claimedMilestoneNumbers = [...rawClaimed]; // Create a copy
                console.log(`claimed_milestones already an array: ${JSON.stringify(claimedMilestoneNumbers)}`);
            } else {
                console.warn(`claimed_milestones has unexpected type: ${typeof rawClaimed}`);
            }
        }
    } else {
        console.warn(`GET /milestones: No user progress found for user ${userId}, season ${activeSeason.season_id}. Assuming no milestones claimed.`);
    }

    // Format milestones
    const formattedMilestones = milestones.map(milestone => {
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
        is_claimed: isClaimed
      };
    });

    res.json({
      season_id: activeSeason.season_id,
      milestones: formattedMilestones
    });
  } catch (error) {
    console.error('Error fetching season milestones:', error);
    res.status(500).json({ error: 'Failed to fetch season milestones' });
  }
});

/**
 * Claim a milestone reward - clear cache after successful claim
 */
router.post('/claim-milestone', authenticateToken, async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const { milestone_number, season_id } = req.body;
    
    if (!milestone_number) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Milestone number is required' });
    }
    
    // Get the current date in UTC
    const now = new Date();
    
    // Find the active season pass - prioritize season_id from request if provided
    let activeSeason;
    if (season_id) {
      activeSeason = await SeasonPass.findOne({
        where: {
          season_id: season_id,
          is_active: true
        },
        transaction
      });
      console.log(`Using provided season_id: ${season_id} from request`);
    }
    
    // Fallback to date-based query if no season found or no ID provided
    if (!activeSeason) {
      activeSeason = await SeasonPass.findOne({
        where: {
          start_date: { [Op.lte]: now },
          end_date: { [Op.gt]: now },
          is_active: true
        },
        transaction
      });
      console.log(`Falling back to date-based active season query`);
    }
    
    if (!activeSeason) {
      await transaction.rollback();
      return res.status(404).json({ error: 'No active season pass found' });
    }
    
    console.log(`Active season found: ${activeSeason.season_id}`);
    
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
    
    // Get or create user progress
    let userProgress, created;
    try {
      [userProgress, created] = await UserSeasonProgress.findOrCreate({
        where: {
          user_id: userId,
          season_id: activeSeason.season_id
        },
        defaults: {
          has_inside_track: false,
          claimed_milestones: '[]' // Empty JSON array as string
        },
        transaction
      });
      
      console.log(`User progress ${created ? 'created' : 'found'} for user ${userId}, season ${activeSeason.season_id}`);
    } catch (error) {
      console.error('Error finding or creating user progress:', error);
      await transaction.rollback();
      return res.status(500).json({ error: 'Failed to create user progress record' });
    }

    if (created) {
      // If we just created it, we need to reload to ensure we have the full model
      await userProgress.reload({ transaction });
      console.log(`Reloaded newly created userProgress record`);
    } else {
      // Only reload existing records (not newly created ones)
      await userProgress.reload({ transaction });
      console.log(`Reloaded userProgress, claimed_milestones is now: ${JSON.stringify(userProgress.claimed_milestones)}`);
    }
    
    // Check if milestone is already claimed (using the refreshed data)
    let claimedMilestones = []; // Start with empty array
    let rawClaimed = userProgress.claimed_milestones; // Get raw value AFTER reload

    if (rawClaimed) { // Check if it's not null/undefined
        if (typeof rawClaimed === 'string') {
            try {
                const parsed = JSON.parse(rawClaimed);
                // Use spread syntax for creating a copy, just in case
                if (Array.isArray(parsed)) { claimedMilestones = [...parsed]; }
                else { console.warn(`Parsed claimed_milestones after reload not array:`, parsed); }
            } catch (e) { console.error('Error parsing claimed_milestones after reload:', e); }
        } else if (Array.isArray(rawClaimed)) {
            claimedMilestones = [...rawClaimed]; // Create copy if already array
        } else {
            console.warn(`claimed_milestones after reload has unexpected type: ${typeof rawClaimed}`);
        }
    }
    console.log(`Claimed milestones array before check: ${JSON.stringify(claimedMilestones)}`);


    // Now check if milestone is already claimed using the potentially updated array
    if (claimedMilestones.includes(milestone_number)) {
        await transaction.rollback();
        console.log(`Milestone ${milestone_number} was found in claimed array. Rolling back.`);
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
      // ... [same implementation for rewards]
    }
    
    // Update claimed milestones (using the local 'claimedMilestones' array)
    claimedMilestones.push(milestone_number);
    userProgress.claimed_milestones = claimedMilestones; // Assign the modified array back
    console.log(`Assigning updated claimedMilestones before save: ${JSON.stringify(userProgress.claimed_milestones)}`);

    // --- Add Logging Around Save ---
    try {
      await userProgress.save({ transaction });
      // Log immediately AFTER save completes successfully within the try block
      console.log(`UserProgress SAVE successful. In-memory claimed_milestones now: ${JSON.stringify(userProgress.claimed_milestones)}`);
    } catch (saveError) {
        console.error(`ERROR during userProgress.save():`, saveError);
        // Re-throw or handle the save error appropriately before rollback
        await transaction.rollback(); // Rollback on save error
        return res.status(500).json({ error: 'Failed to save milestone progress' });
    }
    // ---------------------------------

    // Commit transaction
    await transaction.commit();
    console.log(`Transaction committed successfully for milestone ${milestone_number}.`);

    // Clear the relevant caches after successful transaction
    await clearCache('/current');
    await clearCache('/milestones');

    res.json({
      success: true,
      milestone: milestone_number,
      reward: rewardResult
    });
  } catch (error) {
    // Ensure rollback even if initial operations or reload fails
    if (transaction && transaction.finished !== 'commit' && transaction.finished !== 'rollback') {
        console.log(`Rolling back transaction due to error before commit: ${error.message}`);
        await transaction.rollback();
    }
    // Avoid logging the same error twice if it happened during save
    if (!res.headersSent) { // Only log/send response if not already handled by saveError catch
       console.error('Error claiming milestone (outer catch):', error);
       res.status(500).json({ error: 'Failed to claim milestone' });
    }
  }
});

// Remaining functions (unchanged)...

// Get user's inventory with 1-minute cache
router.get('/inventory', authenticateToken, cacheMiddleware(60), async (req, res) => {
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

// Open a specific pack instance - clear inventory cache after opening
router.post('/inventory/packs/:instanceId/open', authenticateToken, async (req, res, next) => {
  const transaction = await sequelize.transaction(); // Start transaction
  const userId = req.user.id;
  const instanceIdParam = req.params.instanceId;
  const instanceId = parseInt(instanceIdParam, 10);

  // --- Logging from previous step ---
  console.log(`--- Attempting to Open Pack ---`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Request URL: ${req.originalUrl}`);
  console.log(`Authenticated User ID: ${userId}`);
  console.log(`Parsed Instance ID: ${instanceId}`);
  // --- End Logging ---

  try {
    // ... [implementation remains the same]
    
    // 6. Commit transaction
    await transaction.commit();
    console.log(`Transaction committed successfully for pack id: ${instanceId}`);

    // Clear inventory cache after successful transaction
    await clearCache('/inventory');

    // 7. Send success response with granted rewards
    console.log(`Sending success response with rewards: ${JSON.stringify(grantedRewards)}`);
    res.json({
      success: true,
      message: `Successfully opened ${packTypeId}.`,
      opened_pack_instance_id: instanceId,
      pack_type_id: packTypeId,
      rewards: grantedRewards // Send the calculated rewards back to the client
    });

  } catch (error) {
    console.error(`Error opening pack instance ${instanceIdParam}:`, error);
    try {
        await transaction.rollback();
        console.log(`Transaction rolled back due to error for pack id: ${instanceId}`);
    } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
    }
    res.status(500).json({ error: 'Failed to open pack.' });
  }
});

console.log("!!! --- Finished loading seasonPassRoutes.js --- !!!");

module.exports = router;
