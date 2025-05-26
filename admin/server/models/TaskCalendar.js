// File: models/TaskCalendar.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const TaskCalendar = sequelize.define('TaskCalendar', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    set_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'task_sets',
        key: 'set_id'
      }
    }
  }, {
    tableName: 'task_calendar',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['date']
      }
    ]
  });

  TaskCalendar.associate = function(models) {
    TaskCalendar.belongsTo(models.TaskSet, {
      foreignKey: 'set_id',
      targetKey: 'set_id'
    });
  };

  return TaskCalendar;
};
