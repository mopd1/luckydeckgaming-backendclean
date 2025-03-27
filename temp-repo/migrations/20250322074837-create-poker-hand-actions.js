// migrations/YYYYMMDDHHMMSS-create-poker-hand-actions.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('poker_hand_actions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      hand_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'poker_hands',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      betting_round: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'preflop, flop, turn, river'
      },
      position: {
        type: Sequelize.STRING(15),
        allowNull: false,
        comment: 'early, middle, late, blinds'
      },
      action_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'fold, check, call, raise, all-in'
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Amount of the bet/raise if applicable'
      },
      pot_size_before: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Pot size before this action'
      },
      opponent_action_before: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Previous opponent action if applicable'
      },
      hand_strength: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Player hand strength at time of action'
      },
      action_timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    // Add index for faster lookups
    await queryInterface.addIndex('poker_hand_actions', ['hand_id'], {
      name: 'poker_hand_actions_hand_idx'
    });
    await queryInterface.addIndex('poker_hand_actions', ['user_id'], {
      name: 'poker_hand_actions_user_idx'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('poker_hand_actions');
  }
};
