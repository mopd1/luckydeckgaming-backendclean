'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('poker_hands', 'rake', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      comment: 'The amount of rake collected from this hand',
      after: 'chips_won'  // Place after chips_won column
    });
    
    await queryInterface.addColumn('poker_hands', 'rake_eligible', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this hand was eligible for rake (reached the flop)',
      after: 'rake'
    });
    
    await queryInterface.addColumn('poker_hands', 'pot_before_rake', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      comment: 'The total pot amount before rake was deducted',
      after: 'rake_eligible'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('poker_hands', 'rake');
    await queryInterface.removeColumn('poker_hands', 'rake_eligible');
    await queryInterface.removeColumn('poker_hands', 'pot_before_rake');
  }
};
