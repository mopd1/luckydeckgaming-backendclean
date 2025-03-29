'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_season_progress', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      season_id: {
        type: Sequelize.STRING(20),
        allowNull: false,
        references: {
          model: 'season_passes',
          key: 'season_id'
        }
      },
      has_inside_track: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      claimed_milestones: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '[]'
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
    await queryInterface.addIndex('user_season_progress', ['user_id', 'season_id'], {
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_season_progress');
  }
};
