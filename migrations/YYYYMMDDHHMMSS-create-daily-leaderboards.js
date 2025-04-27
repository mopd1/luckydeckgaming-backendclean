// filename: migrations/YYYYMMDDHHMMSS-create-daily-leaderboards.js

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('daily_leaderboards', {
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
      leaderboard_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      score: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      date_period: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add a unique constraint to prevent duplicate entries
    await queryInterface.addIndex('daily_leaderboards', ['user_id', 'leaderboard_type', 'date_period'], {
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('daily_leaderboards');
  }
};
