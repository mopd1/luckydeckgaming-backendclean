// migrations/YYYYMMDDHHMMSS-update-poker-hand-table.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('poker_hands', 'position', {
      type: Sequelize.STRING(15),
      allowNull: true,
      comment: 'Player position at table (early, middle, late, blinds)'
    });
    
    await queryInterface.addColumn('poker_hands', 'preflop_action', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'First action preflop (fold, check, call, raise)'
    });
    
    await queryInterface.addColumn('poker_hands', 'stack_size_before', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Player stack size before hand started'
    });
    
    await queryInterface.addColumn('poker_hands', 'rounds_played', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Number of betting rounds played (1-4)'
    });
    
    await queryInterface.addColumn('poker_hands', 'total_balance_before_buyin', {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'Player total balance before buying into table'
    });
    
    await queryInterface.addColumn('poker_hands', 'buyin_amount', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Amount of chips bought into table'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('poker_hands', 'position');
    await queryInterface.removeColumn('poker_hands', 'preflop_action');
    await queryInterface.removeColumn('poker_hands', 'stack_size_before');
    await queryInterface.removeColumn('poker_hands', 'rounds_played');
    await queryInterface.removeColumn('poker_hands', 'total_balance_before_buyin');
    await queryInterface.removeColumn('poker_hands', 'buyin_amount');
  }
};
