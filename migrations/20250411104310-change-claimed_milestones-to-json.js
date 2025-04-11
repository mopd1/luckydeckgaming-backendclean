'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Change the column type to JSON
    await queryInterface.changeColumn('user_season_progress', 'claimed_milestones', {
      type: Sequelize.JSON, // Use Sequelize.JSON
      allowNull: false,     // Keep allowNull false if it was before
      defaultValue: '[]'    // Provide default value as a JSON *string* for DB compatibility
                            // Or use Sequelize.JSON defaultValue if supported by dialect:
                            // defaultValue: []
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert the column type back to LONGTEXT if needed
    await queryInterface.changeColumn('user_season_progress', 'claimed_milestones', {
      type: Sequelize.TEXT('long'), // Or Sequelize.LONGTEXT if available/preferred
      allowNull: false,
      // You might need to handle default value conversion if reverting
      // defaultValue: NULL (if it was NULL before)
    });
  }
};
