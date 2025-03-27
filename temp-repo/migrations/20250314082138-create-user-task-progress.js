// migrations/YYYYMMDDHHMMSS-create-user-task-progress.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_task_progress', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
      task_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'daily_tasks',
          key: 'task_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      current_repetitions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      reward_claimed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      reset_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      tracking_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
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

    // Add a composite unique index on user_id, task_id, and tracking_date
    await queryInterface.addIndex('user_task_progress', ['user_id', 'task_id', 'tracking_date'], {
      unique: true,
      name: 'user_task_progress_unique_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_task_progress');
  }
};
