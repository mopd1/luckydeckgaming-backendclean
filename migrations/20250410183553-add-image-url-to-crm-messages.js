'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('crm_messages', 'image_url', {
      type: Sequelize.STRING(1024),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('crm_messages', 'image_url');
  }
};
