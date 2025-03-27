'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('StoreTransactions', 'chips_added', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      });

      await queryInterface.addColumn('StoreTransactions', 'gems_added', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      });

      await queryInterface.addColumn('StoreTransactions', 'price', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      });

      // Add index for better query performance
      await queryInterface.addIndex('StoreTransactions', ['user_id', 'type', 'timestamp']);

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('StoreTransactions', 'chips_added');
      await queryInterface.removeColumn('StoreTransactions', 'gems_added');
      await queryInterface.removeColumn('StoreTransactions', 'price');
      
      // Remove the index
      await queryInterface.removeIndex('StoreTransactions', ['user_id', 'type', 'timestamp']);
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};
