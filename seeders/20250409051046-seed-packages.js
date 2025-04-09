// seeders/YYYYMMDDHHMMSS-seed-packages.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('packages', [
      {
        active: true,
        price: 2.00,
        chips: 200000,
        gems: 0,
        display_order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        active: true,
        price: 5.00,
        chips: 500000,
        gems: 30,
        display_order: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        active: true,
        price: 10.00,
        chips: 1200000,
        gems: 60,
        display_order: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        active: true,
        price: 20.00,
        chips: 2500000,
        gems: 150,
        display_order: 4,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        active: true,
        price: 50.00,
        chips: 7000000,
        gems: 1000,
        display_order: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        active: true,
        price: 100.00,
        chips: 15000000,
        gems: 2000,
        display_order: 6,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('packages', null, {});
  }
};
