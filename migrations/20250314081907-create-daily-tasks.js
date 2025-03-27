// migrations/YYYYMMDDHHMMSS-create-daily-tasks.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('daily_tasks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      task_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      action_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'task_actions',
          key: 'action_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      required_repetitions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      reward_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'gems'
      },
      reward_amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('daily_tasks');
  }
};
