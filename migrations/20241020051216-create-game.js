'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Games', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.STRING
      },
      format: {
        type: Sequelize.STRING
      },
      rake_percentage: {
        type: Sequelize.DECIMAL
      },
      rake_cap: {
        type: Sequelize.INTEGER
      },
      percent_of_field_paid: {
        type: Sequelize.INTEGER
      },
      min_players: {
        type: Sequelize.INTEGER
      },
      max_players: {
        type: Sequelize.INTEGER
      },
      min_stake: {
        type: Sequelize.DECIMAL
      },
      max_stake: {
        type: Sequelize.DECIMAL
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
    await queryInterface.dropTable('Games');
  }
};