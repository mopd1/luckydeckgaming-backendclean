// File: models/TaskSet.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const TaskSet = sequelize.define('TaskSet', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    set_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      collate: 'utf8mb4_unicode_ci'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'task_sets',
    modelName: 'TaskSet',
    timestamps: true
  });

  TaskSet.associate = function(models) {
    TaskSet.belongsToMany(models.DailyTask, {
      through: models.TaskSetTasks,
      foreignKey: 'set_id',
      sourceKey: 'set_id',
      otherKey: 'task_id',
      as: 'dailyTasks'
    });
  };

  return TaskSet;
};
