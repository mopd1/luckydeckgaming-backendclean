'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('season_milestones', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      milestone_id: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      season_id: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: {
          model: 'season_passes',
          key: 'season_id'
        }
      },
      milestone_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      required_points: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      free_reward_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'chips'
      },
      free_reward_amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      paid_reward_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'chips'
      },
      paid_reward_amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    // Create index for efficient querying
    await queryInterface.addIndex('season_milestones', ['season_id', 'milestone_number'], {
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('season_milestones');
  }
};
