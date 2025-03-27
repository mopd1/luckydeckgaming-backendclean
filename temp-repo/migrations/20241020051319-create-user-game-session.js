'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserGameSessions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.BIGINT
      },
      session_id: {
        type: Sequelize.INTEGER
      },
      buy_in: {
        type: Sequelize.DECIMAL
      },
      cash_out: {
        type: Sequelize.DECIMAL
      },
      rake_paid: {
        type: Sequelize.DECIMAL
      },
      challenge_points_earned: {
        type: Sequelize.INTEGER
      },
      milestones_reached: {
        type: Sequelize.INTEGER
      },
      free_chips_taken: {
        type: Sequelize.INTEGER
      },
      purchases: {
        type: Sequelize.INTEGER
      },
      chips_purchased: {
        type: Sequelize.INTEGER
      },
      revenue: {
        type: Sequelize.DECIMAL
      },
      poker_hands_played: {
        type: Sequelize.INTEGER
      },
      sngs_played: {
        type: Sequelize.INTEGER
      },
      tournaments_played: {
        type: Sequelize.INTEGER
      },
      blackjack_hands_played: {
        type: Sequelize.INTEGER
      },
      slot_spins: {
        type: Sequelize.INTEGER
      },
      avatar_parts_purchased: {
        type: Sequelize.INTEGER
      },
      packages_purchased: {
        type: Sequelize.INTEGER
      },
      avatars_confirmed: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserGameSessions');
  }
};