// migrations/YYYYMMDDHHMMSS-add-action-points-to-users.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'action_points', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'action_points');
  }
};
