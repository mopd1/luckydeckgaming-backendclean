'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'avatar_data', {
      type: Sequelize.JSON,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'owned_avatar_parts', {
      type: Sequelize.JSON,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'avatar_data');
    await queryInterface.removeColumn('users', 'owned_avatar_parts');
  }
};
