const cron = require('node-cron');
const { 
  SeasonPass, 
  SeasonMilestone,
  sequelize 
} = require('../models');
const { Op } = require('sequelize');

// Generate the default milestone points
function generateDefaultMilestonePoints(milestoneCount = 30) {
  const points = [];
  
  // First few milestones have low requirements
  points.push(100);  // Milestone 1
  points.push(250);  // Milestone 2
  points.push(500);  // Milestone 3
  
  // Middle milestones scale up gradually
  for (let i = 3; i < 20; i++) {
    points.push(500 + (i - 2) * 300);
  }
  
  // Last milestones scale up more steeply
  for (let i = 20; i < milestoneCount; i++) {
    points.push(6000 + (i - 19) * 500);
  }
  
  return points;
}

// Generate default rewards
function generateDefaultRewards(milestoneNumber) {
  // Basic rewards
  const rewards = {
    free_reward_type: 'chips',
    free_reward_amount: 1000 * milestoneNumber,
    paid_reward_type: 'chips',
    paid_reward_amount: 2000 * milestoneNumber
  };
  
  // Special milestones with different rewards
  if (milestoneNumber % 5 === 0) { // Every 5th milestone
    rewards.free_reward_type = 'gems';
    rewards.free_reward_amount = 50 * (milestoneNumber / 5);
    
    rewards.paid_reward_type = 'gems';
    rewards.paid_reward_amount = 100 * (milestoneNumber / 5);
  }
  
  if (milestoneNumber % 10 === 0) { // Every 10th milestone
    rewards.free_reward_type = 'pack';
    rewards.free_reward_amount = 1; // Pack ID
    
    rewards.paid_reward_type = 'pack';
    rewards.paid_reward_amount = 2; // Premium pack ID
  }
  
  return rewards;
}

// Create a new season for the current month
async function createNewSeason() {
  const transaction = await sequelize.transaction();
  
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calculate start of current month
    const startDate = new Date(currentYear, currentMonth, 1);
    
    // Calculate end of current month (start of next month minus 1 millisecond)
    const endDate = new Date(currentYear, currentMonth + 1, 1);
    endDate.setMilliseconds(endDate.getMilliseconds() - 1);
    
    // Generate season name
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const seasonName = `${monthNames[currentMonth]} ${currentYear} Season`;
    const seasonId = `${monthNames[currentMonth].substring(0, 3)}${currentYear}`;
    
    // Check if season already exists
    const existingSeason = await SeasonPass.findOne({
      where: {
        [Op.or]: [
          { season_id: seasonId },
          {
            start_date: { [Op.lte]: endDate },
            end_date: { [Op.gte]: startDate }
          }
        ]
      },
      transaction
    });
    
    if (existingSeason) {
      console.log('Season already exists for this month');
      await transaction.commit();
      return;
    }
    
    // Create the new season
    const season = await SeasonPass.create({
      season_id: seasonId,
      name: seasonName,
      description: `Season pass for ${monthNames[currentMonth]} ${currentYear}`,
      start_date: startDate,
      end_date: endDate,
      is_active: true,
      created_by: 1 // Default admin user
    }, { transaction });
    
    console.log(`Created new season: ${seasonName}`);
    
    // Create milestones
    const milestonePoints = generateDefaultMilestonePoints(30);
    
    for (let i = 0; i < 30; i++) {
      const milestoneNumber = i + 1;
      const milestoneId = `${seasonId}_${milestoneNumber}`;
      const requiredPoints = milestonePoints[i];
      const rewards = generateDefaultRewards(milestoneNumber);
      
      await SeasonMilestone.create({
        milestone_id: milestoneId,
        season_id: seasonId,
        milestone_number: milestoneNumber,
        required_points: requiredPoints,
        free_reward_type: rewards.free_reward_type,
        free_reward_amount: rewards.free_reward_amount,
        paid_reward_type: rewards.paid_reward_type,
        paid_reward_amount: rewards.paid_reward_amount,
        is_active: true
      }, { transaction });
    }
    
    await transaction.commit();
    console.log(`Created 30 milestones for season ${seasonName}`);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating new season:', error);
  }
}

// Schedule the job to run on the 1st day of each month at 00:01 UTC
function scheduleSeasonCreation() {
  // '1 0 1 * *' = 1 minute past midnight on the 1st day of each month
  cron.schedule('1 0 1 * *', async () => {
    console.log('Running scheduled task: Create new season');
    await createNewSeason();
  });
  
  console.log('Scheduled season creation job for 1st day of every month');
}

module.exports = {
  createNewSeason,
  scheduleSeasonCreation
};
