// File: models/TaskAction.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const TaskAction = sequelize.define('TaskAction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    action_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    tracking_event: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Event type to track (poker_hand, blackjack_win, etc.)'
    },
    tracking_conditions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Optional JSON conditions for tracking this action'
    }
  }, {
    tableName: 'task_actions',
    timestamps: true
  });

  return TaskAction;
};
