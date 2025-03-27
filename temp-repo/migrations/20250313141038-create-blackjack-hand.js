'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BlackjackHands', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER
      },
      table_id: {
        type: Sequelize.STRING
      },
      hand_number: {
        type: Sequelize.INTEGER
      },
      stake_level: {
        type: Sequelize.INTEGER
      },
      player_cards: {
        type: Sequelize.TEXT
      },
      dealer_cards: {
        type: Sequelize.TEXT
      },
      initial_bet: {
        type: Sequelize.INTEGER
      },
      insurance_bet: {
        type: Sequelize.INTEGER
      },
      outcome: {
        type: Sequelize.STRING
      },
      payout: {
        type: Sequelize.INTEGER
      },
      doubled: {
        type: Sequelize.BOOLEAN
      },
      surrendered: {
        type: Sequelize.BOOLEAN
      },
      split: {
        type: Sequelize.BOOLEAN
      },
      played_at: {
        type: Sequelize.DATE
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
    await queryInterface.dropTable('BlackjackHands');
  }
};