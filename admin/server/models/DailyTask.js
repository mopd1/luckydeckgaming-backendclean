// File: models/DailyTask.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const DailyTask = sequelize.define('DailyTask', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    task_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      collate: 'utf8mb4_unicode_ci'
    },
    action_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      collate: 'utf8mb4_unicode_ci',
      references: {
        model: 'task_actions',
        key: 'action_id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    required_repetitions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    reward_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'gems'
    },
    reward_amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'daily_tasks',
    modelName: 'DailyTask',
    timestamps: true
  });

  DailyTask.associate = function(models) {
    DailyTask.belongsTo(models.TaskAction, {
      foreignKey: 'action_id',
      targetKey: 'action_id',
      as: 'action'
    });
    DailyTask.belongsToMany(models.TaskSet, {
      through: models.TaskSetTasks,
      foreignKey: 'task_id',
      sourceKey: 'task_id',
      otherKey: 'set_id',
      as: 'taskSet'
    });
    DailyTask.hasMany(models.CRMMessage, {
      foreignKey: 'task_id',
      sourceKey: 'task_id'
    });
  };

  return DailyTask;
};
