'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, make sure milestone_id is a proper key in season_milestones
    await queryInterface.addIndex('season_milestones', ['milestone_id'], {
      unique: true,
      name: 'idx_season_milestones_milestone_id'
    });
    
    // Now create the milestone_rewards table
    await queryInterface.createTable('milestone_rewards', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      milestone_id: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: {
          model: 'season_milestones',
          key: 'milestone_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      track_type: {
        type: Sequelize.ENUM('free', 'paid'),
        allowNull: false
      },
      reward_type: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      reward_amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    // Add additional indexes
    await queryInterface.addIndex('milestone_rewards', ['milestone_id']);
    await queryInterface.addIndex('milestone_rewards', ['track_type']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('milestone_rewards');
    // Optionally remove the index we added
    await queryInterface.removeIndex('season_milestones', 'idx_season_milestones_milestone_id');
  }
};
