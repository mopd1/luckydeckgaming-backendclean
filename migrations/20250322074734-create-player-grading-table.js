// migrations/YYYYMMDDHHMMSS-create-player-grading-table.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('player_gradings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      overall_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Overall player score (0-100)'
      },
      hand_selection_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Score for starting hand selection (0-100)'
      },
      betting_strategy_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Score for betting strategy (0-100)'
      },
      positional_awareness_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Score for positional play (0-100)'
      },
      post_flop_decision_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Score for post-flop decisions (0-100)'
      },
      bluffing_effectiveness_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Score for bluffing effectiveness (0-100)'
      },
      discipline_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Score for discipline (0-100)'
      },
      opponent_adaptation_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Score for adapting to opponents (0-100)'
      },
      bankroll_management_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Score for bankroll management (0-100)'
      },
      hands_analyzed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of hands analyzed for scoring'
      },
      last_reset_time: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time scores were reset by user'
      },
      reset_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of times scores have been reset'
      },
      privacy_settings: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'User privacy settings for score visibility'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    // Add a unique index on user_id
    await queryInterface.addIndex('player_gradings', ['user_id'], {
      unique: true,
      name: 'player_grading_user_idx'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('player_gradings');
  }
};
