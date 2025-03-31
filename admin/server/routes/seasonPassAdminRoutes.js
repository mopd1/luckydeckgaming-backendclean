const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/userAuth');
const { User, SeasonPass, SeasonMilestone, UserSeasonProgress, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const axios = require('axios');
const { google } = require('googleapis');

/**
 * Get all season passes
 */
router.get('/seasons', authenticateToken, async (req, res) => {
  try {
    const seasons = await SeasonPass.findAll({
      order: [['created_at', 'DESC']]
    });
    
    res.json(seasons);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    res.status(500).json({ error: 'Failed to fetch seasons' });
  }
});

/**
 * Get a specific season
 */
router.get('/seasons/:seasonId', authenticateToken, async (req, res) => {
  try {
    const season = await SeasonPass.findOne({
      where: { season_id: req.params.seasonId },
      include: [{
        model: SeasonMilestone,
        order: [['milestone_number', 'ASC']]
      }]
    });
    
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    res.json(season);
  } catch (error) {
    console.error('Error fetching season:', error);
    res.status(500).json({ error: 'Failed to fetch season' });
  }
});

/**
 * Create a new season
 */
router.post('/seasons', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      name, 
      description, 
      start_date, 
      end_date,
      is_active = true
    } = req.body;
    
    // Validate inputs
    if (!name || !start_date || !end_date) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Name, start date, and end date are required' });
    }
    
    // Generate season_id from name (e.g., "Summer2025")
    const season_id = name.replace(/[^a-zA-Z0-9]/g, '') + 
      new Date(start_date).getFullYear();
    
    // Create season
    const season = await SeasonPass.create({
      season_id,
      name,
      description,
      start_date,
      end_date,
      is_active,
      created_by: req.user.id
    }, { transaction });
    
    await transaction.commit();
    
    res.status(201).json(season);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating season:', error);
    res.status(500).json({ error: 'Failed to create season' });
  }
});

/**
 * Update a season
 */
router.put('/seasons/:seasonId', authenticateToken, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      start_date, 
      end_date,
      is_active
    } = req.body;
    
    const season = await SeasonPass.findOne({
      where: { season_id: req.params.seasonId }
    });
    
    if (!season) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Update fields
    if (name) season.name = name;
    if (description !== undefined) season.description = description;
    if (start_date) season.start_date = start_date;
    if (end_date) season.end_date = end_date;
    if (is_active !== undefined) season.is_active = is_active;
    
    await season.save();
    
    res.json(season);
  } catch (error) {
    console.error('Error updating season:', error);
    res.status(500).json({ error: 'Failed to update season' });
  }
});

/**
 * Delete a season
 */
router.delete('/seasons/:seasonId', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const season = await SeasonPass.findOne({
      where: { season_id: req.params.seasonId },
      transaction
    });
    
    if (!season) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Check if there's any user progress for this season
    const progressCount = await UserSeasonProgress.count({
      where: { season_id: req.params.seasonId },
      transaction
    });
    
    if (progressCount > 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Cannot delete season with user progress',
        message: 'There are users who have made progress in this season. Deactivate it instead.'
      });
    }
    
    // Delete milestones first
    await SeasonMilestone.destroy({
      where: { season_id: req.params.seasonId },
      transaction
    });
    
    // Delete the season
    await season.destroy({ transaction });
    
    await transaction.commit();
    
    res.json({ message: 'Season deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting season:', error);
    res.status(500).json({ error: 'Failed to delete season' });
  }
});

/**
 * Toggle the active status of a season
 * This will also deactivate any other currently active season.
 */
router.put('/seasons/:seasonId/toggle-active', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  const seasonIdToActivate = req.params.seasonId;

  try {
    // Find the season to be toggled
    const seasonToToggle = await SeasonPass.findOne({
      where: { season_id: seasonIdToActivate },
      transaction
    });

    if (!seasonToToggle) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Season not found' });
    }

    const newActiveState = !seasonToToggle.is_active;

    // If activating this season, deactivate all others first
    if (newActiveState === true) {
      await SeasonPass.update(
        { is_active: false },
        {
          where: {
            season_id: { [Op.ne]: seasonIdToActivate }, // Op.ne means "not equal"
            is_active: true
          },
          transaction
        }
      );
      console.log(`Deactivated other active seasons before activating ${seasonIdToActivate}`);
    }

    // Now update the target season's status
    seasonToToggle.is_active = newActiveState;
    await seasonToToggle.save({ transaction });

    console.log(`Season ${seasonIdToActivate} active status set to ${newActiveState}`);

    await transaction.commit();
    res.json({ message: `Season ${seasonToToggle.name} status updated successfully.`, season: seasonToToggle });

  } catch (error) {
    await transaction.rollback();
    console.error(`Error toggling active status for season ${seasonIdToActivate}:`, error);
    res.status(500).json({ error: 'Failed to toggle season status' });
  }
});

/**
 * Get milestones for a season
 */
router.get('/seasons/:seasonId/milestones', authenticateToken, async (req, res) => {
  try {
    const milestones = await SeasonMilestone.findAll({
      where: { season_id: req.params.seasonId },
      order: [['milestone_number', 'ASC']]
    });
    
    res.json(milestones);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

/**
 * Create multiple milestones at once
 */
router.post('/seasons/:seasonId/milestones', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { milestones } = req.body;
    
    if (!Array.isArray(milestones) || milestones.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Milestones array is required' });
    }
    
    // Validate season exists
    const season = await SeasonPass.findOne({
      where: { season_id: req.params.seasonId },
      transaction
    });
    
    if (!season) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Create all milestones
    const createdMilestones = [];
    
    for (const milestone of milestones) {
      const {
        milestone_number,
        required_points,
        free_reward_type,
        free_reward_amount,
        paid_reward_type,
        paid_reward_amount
      } = milestone;
      
      // Validate required fields
      if (!milestone_number || required_points === undefined) {
        continue; // Skip invalid entries
      }
      
      // Generate milestone_id
      const milestone_id = `${req.params.seasonId}_${milestone_number}`;
      
      // Create or update the milestone
      const [milestoneRecord, created] = await SeasonMilestone.findOrCreate({
        where: {
          season_id: req.params.seasonId,
          milestone_number
        },
        defaults: {
          milestone_id,
          required_points,
          free_reward_type: free_reward_type || 'chips',
          free_reward_amount: free_reward_amount || 0,
          paid_reward_type: paid_reward_type || 'chips',
          paid_reward_amount: paid_reward_amount || 0,
          is_active: true
        },
        transaction
      });
      
      if (!created) {
        // Update existing milestone
        milestoneRecord.required_points = required_points;
        if (free_reward_type) milestoneRecord.free_reward_type = free_reward_type;
        if (free_reward_amount !== undefined) milestoneRecord.free_reward_amount = free_reward_amount;
        if (paid_reward_type) milestoneRecord.paid_reward_type = paid_reward_type;
        if (paid_reward_amount !== undefined) milestoneRecord.paid_reward_amount = paid_reward_amount;
        
        await milestoneRecord.save({ transaction });
      }
      
      createdMilestones.push(milestoneRecord);
    }
    
    await transaction.commit();
    
    res.status(201).json({
      message: `${createdMilestones.length} milestones created/updated successfully`,
      milestones: createdMilestones
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating milestones:', error);
    res.status(500).json({ error: 'Failed to create milestones' });
  }
});

/**
 * Import milestones from Google Sheet
 */
router.post('/import-sheet', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { season_id, sheet_url } = req.body;
    
    if (!season_id || !sheet_url) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Season ID and sheet URL are required' });
    }
    
    // Validate season exists
    const season = await SeasonPass.findOne({
      where: { season_id },
      transaction
    });
    
    if (!season) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Season not found' });
    }
    
    // Extract sheet ID from URL
    const sheetIdMatch = sheet_url.match(/[-\w]{25,}/);
    if (!sheetIdMatch) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid Google Sheet URL' });
    }
    
    const sheetId = sheetIdMatch[0];
    
    // Fetch the sheet data using public API
    // Note: This assumes the sheet has been published to the web or shared publicly
    const response = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A10:J41?key=${process.env.GOOGLE_API_KEY}`
    );
    
    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No data found in the spreadsheet' });
    }
    
    // Parse the rows and create milestones
    const milestones = [];
    
    for (let i = 0; i < rows.length && i < 30; i++) {
      const row = rows[i];
      
      // Skip if row doesn't have enough columns
      if (row.length < 5) continue;
      
      // Milestone number is i+1 (1-indexed)
      const milestone_number = i + 1;
      
      // Extract data from columns
      const required_points = parseInt(row[1]) || 0;
      const free_reward_type = row[2] || 'chips';
      const free_reward_amount = parseInt(row[3]) || 0;
      const paid_reward_type = row[4] || 'chips';
      const paid_reward_amount = parseInt(row[5]) || 0;
      
      milestones.push({
        milestone_number,
        required_points,
        free_reward_type,
        free_reward_amount,
        paid_reward_type,
        paid_reward_amount
      });
    }
    
    // Create all milestones
    const createdMilestones = [];
    
    for (const milestone of milestones) {
      const milestone_id = `${season_id}_${milestone.milestone_number}`;
      
      const [milestoneRecord, created] = await SeasonMilestone.findOrCreate({
        where: {
          season_id,
          milestone_number: milestone.milestone_number
        },
        defaults: {
          milestone_id,
          ...milestone,
          is_active: true
        },
        transaction
      });
      
      if (!created) {
        // Update existing milestone
        await milestoneRecord.update(milestone, { transaction });
      }
      
      createdMilestones.push(milestoneRecord);
    }
    
    await transaction.commit();
    
    res.status(201).json({
      message: `${createdMilestones.length} milestones imported successfully`,
      milestones: createdMilestones
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error importing from sheet:', error);
    res.status(500).json({ error: 'Failed to import from sheet' });
  }
});

/**
 * Get user progress for a season
 */
router.get('/seasons/:seasonId/user-progress', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const { count, rows } = await UserSeasonProgress.findAndCountAll({
      where: { season_id: req.params.seasonId },
      include: [{
        model: User,
        attributes: ['id', 'username', 'display_name', 'email', 'action_points']
      }],
      limit,
      offset,
      order: [['updated_at', 'DESC']]
    });
    
    res.json({
      total: count,
      page: parseInt(page),
      total_pages: Math.ceil(count / limit),
      data: rows
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Failed to fetch user progress' });
  }
});

/**
 * Get season pass analytics 
 */
router.get('/seasons/:seasonId/analytics', authenticateToken, async (req, res) => {
  try {
    const seasonId = req.params.seasonId;
    
    // Get total users in the system
    const totalUsers = await User.count();
    
    // Get users with this season progress
    const usersWithProgress = await UserSeasonProgress.count({
      where: { season_id: seasonId }
    });
    
    // Get users with inside track
    const usersWithInsideTrack = await UserSeasonProgress.count({
      where: { 
        season_id: seasonId,
        has_inside_track: true
      }
    });
    
    // Get milestone completion data
    const progressData = await UserSeasonProgress.findAll({
      where: { season_id: seasonId },
      attributes: ['claimed_milestones']
    });
    
    // Count claimed milestones
    const milestoneCounts = {};
    let totalClaimedMilestones = 0;
    
    for (const progress of progressData) {
      const milestones = progress.claimed_milestones || [];
      
      for (const milestone of milestones) {
        milestoneCounts[milestone] = (milestoneCounts[milestone] || 0) + 1;
        totalClaimedMilestones++;
      }
    }
    
    // Sort milestone counts
    const sortedMilestoneCounts = Object.entries(milestoneCounts)
      .map(([milestone, count]) => ({ milestone: parseInt(milestone), count }))
      .sort((a, b) => a.milestone - b.milestone);
    
    // Calculate average milestone completion
    let avgMilestones = 0;
    if (usersWithProgress > 0) {
      avgMilestones = totalClaimedMilestones / usersWithProgress;
    }
    
    // Calculate conversion rate
    let conversionRate = 0;
    if (usersWithProgress > 0) {
      conversionRate = (usersWithInsideTrack / usersWithProgress) * 100;
    }
    
    res.json({
      total_users: totalUsers,
      users_with_progress: usersWithProgress,
      users_with_inside_track: usersWithInsideTrack,
      conversion_rate: conversionRate,
      avg_milestones_completed: avgMilestones,
      milestone_completion: sortedMilestoneCounts
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
