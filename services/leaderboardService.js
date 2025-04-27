const cron = require('node-cron');
const db = require('../models');
const { User, DailyLeaderboard, UserInventory } = db;
const { Op } = require('sequelize');

// Function to determine the pack type based on rank
const getPackTypeForRank = (rank) => {
  switch (rank) {
    case 1: return 'briefcase_pack';
    case 2: return 'holdall_pack';
    case 3: return 'envelope_pack';
    default: return null;
  }
};

// Function to add a pack to user inventory
const addPackToInventory = async (userId, packType) => {
  try {
    await UserInventory.create({
      user_id: userId,
      item_type: 'pack',
      pack_type_id: packType,
      quantity: 1,
      acquired_from: 'leaderboard_reward',
      metadata: JSON.stringify({
        source: 'Daily Leaderboard Reward',
        dateAwarded: new Date().toISOString()
      })
    });
    
    console.log(`Added ${packType} to user ${userId} inventory`);
    return true;
  } catch (error) {
    console.error(`Failed to add pack to inventory for user ${userId}:`, error);
    return false;
  }
};

// Function to award prizes for a specific leaderboard type
const awardPrizesForLeaderboard = async (leaderboardType, yesterday) => {
  try {
    // Get top 3 players for yesterday
    const topPlayers = await DailyLeaderboard.findAll({
      where: {
        leaderboard_type: leaderboardType,
        date_period: yesterday
      },
      order: [['score', 'DESC']],
      limit: 3
    });
    
    // Award prizes to each player
    for (let i = 0; i < topPlayers.length; i++) {
      const player = topPlayers[i];
      const packType = getPackTypeForRank(i + 1);
      
      if (packType) {
        await addPackToInventory(player.user_id, packType);
        
        // Optional: log the award
        console.log(`Awarded ${packType} to user ${player.user_id} for rank ${i + 1} in ${leaderboardType} leaderboard`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to award prizes for ${leaderboardType}:`, error);
    return false;
  }
};

// Main function to process daily leaderboard reset
const processDailyLeaderboardReset = async () => {
  try {
    console.log('Starting daily leaderboard reset process...');
    
    // Calculate yesterday's date (for awarding prizes)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Award prizes for each leaderboard type
    await awardPrizesForLeaderboard('action_points', yesterdayStr);
    await awardPrizesForLeaderboard('poker_winnings', yesterdayStr);
    await awardPrizesForLeaderboard('blackjack_winnings', yesterdayStr);
    
    // Optional: Keep leaderboard history for analysis by not deleting entries
    // Otherwise, uncomment below to delete entries older than yesterday
    /*
    const deletedCount = await DailyLeaderboard.destroy({
      where: {
        date_period: {
          [Op.lt]: yesterdayStr
        }
      }
    });
    console.log(`Deleted ${deletedCount} old leaderboard entries`);
    */
    
    console.log('Daily leaderboard reset process completed');
    return true;
  } catch (error) {
    console.error('Error in daily leaderboard reset process:', error);
    return false;
  }
};

// Schedule the job to run at midnight every day
const scheduleDailyLeaderboardReset = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running scheduled daily leaderboard reset');
    await processDailyLeaderboardReset();
  });
  
  console.log('Daily leaderboard reset scheduled to run at midnight');
};

module.exports = {
  scheduleDailyLeaderboardReset,
  processDailyLeaderboardReset // Export for manual triggering if needed
};
