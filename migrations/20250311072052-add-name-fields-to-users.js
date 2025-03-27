'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'first_name', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'surname', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'nickname', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'first_name');
    await queryInterface.removeColumn('users', 'surname');
    await queryInterface.removeColumn('users', 'nickname');
  }
};
