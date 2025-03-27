'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('BlackjackHands', 'streak_multiplier_applied', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Whether a streak multiplier was applied to this hand'
    });

    await queryInterface.addColumn('BlackjackHands', 'streak_count', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      comment: 'The current streak count when this hand was played'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('BlackjackHands', 'streak_multiplier_applied');
    await queryInterface.removeColumn('BlackjackHands', 'streak_count');
  }
};
