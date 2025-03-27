'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'display_name', {
      type: Sequelize.STRING(50),
      allowNull: true
    });

    // Set display_name to username for existing users
    await queryInterface.sequelize.query(
      'UPDATE users SET display_name = username WHERE display_name IS NULL'
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'display_name');
  }
};
