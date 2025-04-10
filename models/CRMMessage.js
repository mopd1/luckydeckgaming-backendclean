// models/CRMMessage.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const CRMMessage = sequelize.define('CRMMessage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    character_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'crm_characters',
        key: 'id'
      }
    },
    message_type: {
      type: DataTypes.ENUM('INFO', 'TASK', 'REWARD'),
      allowNull: false,
      defaultValue: 'INFO'
    },
    task_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      references: {
        model: 'daily_tasks',
        key: 'task_id'
      }
    },
    task_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    reward_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    reward_amount: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    trigger_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    trigger_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    segment_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'crm_messages',
    timestamps: true,
    underscored: true
  });
  CRMMessage.associate = function(models) {
    CRMMessage.belongsTo(models.CRMCharacter, {
      foreignKey: 'character_id',
      as: 'character'
    });
    CRMMessage.belongsTo(models.DailyTask, {
      foreignKey: 'task_id',
      targetKey: 'task_id'
    });
    // Change from belongsToMany to hasMany for direct access
    CRMMessage.hasMany(models.UserCRMMessage, {
      foreignKey: 'message_id'
    });
  };
  return CRMMessage;
};
