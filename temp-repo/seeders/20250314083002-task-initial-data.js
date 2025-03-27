// seeders/YYYYMMDDHHMMSS-task-initial-data.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Insert task actions
    await queryInterface.bulkInsert('task_actions', [
      {
        action_id: 'play_poker_hand',
        name: 'Play NL Holdem Cash Game Hand',
        description: 'Play a hand of No-Limit Texas Hold\'em cash game',
        tracking_event: 'poker_hand',
        tracking_conditions: JSON.stringify({ game_type: 'texas_holdem' }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        action_id: 'win_blackjack_hand',
        name: 'Win Blackjack Hand',
        description: 'Win a hand of Blackjack',
        tracking_event: 'blackjack_win',
        tracking_conditions: JSON.stringify({ outcome: ['WIN', 'BLACKJACK'] }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // 2. Insert daily tasks
    await queryInterface.bulkInsert('daily_tasks', [
      {
        task_id: 'task1',
        action_id: 'play_poker_hand',
        name: 'Poker Pro',
        description: 'Play 10 hands of NL Holdem Cash Games',
        required_repetitions: 10,
        reward_type: 'gems',
        reward_amount: 1000,
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        task_id: 'task2',
        action_id: 'win_blackjack_hand',
        name: 'Blackjack Master',
        description: 'Win 10 hands of Blackjack',
        required_repetitions: 10,
        reward_type: 'gems',
        reward_amount: 500,
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // 3. Insert default task set
    await queryInterface.bulkInsert('task_sets', [
      {
        set_id: 'default',
        name: 'Default Daily Tasks',
        description: 'Default set of daily tasks',
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // 4. Associate tasks with the default set
    await queryInterface.bulkInsert('task_set_tasks', [
      {
        set_id: 'default',
        task_id: 'task1',
        display_order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        set_id: 'default',
        task_id: 'task2',
        display_order: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // 5. Add today to the calendar with the default set
    const today = new Date().toISOString().split('T')[0];
    await queryInterface.bulkInsert('task_calendar', [
      {
        date: today,
        set_id: 'default',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove everything in reverse order
    await queryInterface.bulkDelete('task_calendar', null, {});
    await queryInterface.bulkDelete('task_set_tasks', null, {});
    await queryInterface.bulkDelete('task_sets', null, {});
    await queryInterface.bulkDelete('daily_tasks', null, {});
    await queryInterface.bulkDelete('task_actions', null, {});
    await queryInterface.bulkDelete('user_task_progress', null, {});
  }
};
