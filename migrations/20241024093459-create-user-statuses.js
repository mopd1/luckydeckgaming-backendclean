'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all existing users
    const users = await queryInterface.sequelize.query(
      'SELECT id FROM Users',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Get all existing user statuses
    const existingStatuses = await queryInterface.sequelize.query(
      'SELECT user_id FROM UserStatus',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Extract existing user IDs
    const existingUserIds = existingStatuses.map(status => status.user_id);

    // Insert new statuses for users without a status entry
    const newUserStatuses = users
      .filter(user => !existingUserIds.includes(user.id))  // Only new users without a status
      .map(user => ({
        user_id: user.id,
        status: 'offline',
        last_active: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

    if (newUserStatuses.length > 0) {
      await queryInterface.bulkInsert('UserStatus', newUserStatuses);
    }

    // Optionally update the status of existing users, if necessary
    for (const user of users) {
      if (existingUserIds.includes(user.id)) {
        await queryInterface.bulkUpdate(
          'UserStatus',
          {
            last_active: new Date(),
            updatedAt: new Date(),
          },
          { user_id: user.id }
        );
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('UserStatus', null, {});
  },
};
