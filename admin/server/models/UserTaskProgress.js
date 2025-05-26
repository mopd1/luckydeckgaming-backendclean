// File: models/UserTaskProgress.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserTaskProgress = sequelize.define('UserTaskProgress', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    task_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'daily_tasks',
        key: 'task_id'
      }
    },
    current_repetitions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    reward_claimed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    reset_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    tracking_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  }, {
    tableName: 'user_task_progress',
    timestamps: true
  });

  UserTaskProgress.associate = function(models) {
    UserTaskProgress.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE'
    });
  };

  return UserTaskProgress;
};
