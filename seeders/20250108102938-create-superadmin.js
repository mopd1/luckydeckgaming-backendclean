'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('YourSecurePassword123!', 10);
    return queryInterface.bulkInsert('Admins', [{
      username: 'superadmin',
      password: hashedPassword,
      role: 'superadmin',
      permissions: JSON.stringify({
        users: ['read', 'write', 'delete'],
        transactions: ['read', 'write'],
        games: ['read', 'write', 'manage']
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Admins', null, {});
  }
};
