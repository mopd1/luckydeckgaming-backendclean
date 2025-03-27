// migrations/YYYYMMDDHHMMSS-create-task-set-tasks.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('task_set_tasks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      set_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'task_sets',
          key: 'set_id'
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
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    // Add a composite unique index on set_id and task_id
    await queryInterface.addIndex('task_set_tasks', ['set_id', 'task_id'], {
      unique: true,
      name: 'task_set_tasks_unique_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('task_set_tasks');
  }
};
