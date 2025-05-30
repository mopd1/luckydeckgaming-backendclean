// File: models/TaskSetTasks.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const TaskSetTasks = sequelize.define('TaskSetTasks', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    set_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      collate: 'utf8mb4_unicode_ci',
      references: {
        model: 'task_sets',
        key: 'set_id'
      }
    },
    task_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      collate: 'utf8mb4_unicode_ci',
      references: {
        model: 'daily_tasks',
        key: 'task_id'
      }
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'task_set_tasks',
    timestamps: true,
    underscored: true,
    modelName: 'TaskSetTasks'
  });

  return TaskSetTasks;
};
