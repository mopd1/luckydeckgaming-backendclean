// models/UserCRMMessage.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserCRMMessage = sequelize.define('UserCRMMessage', {
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
    message_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'crm_messages',
        key: 'id'
      }
    },
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    archived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    }
  }, {
    tableName: 'user_crm_messages',
    timestamps: true,
    underscored: true
  });

  UserCRMMessage.associate = function(models) {
    // Associations are defined in the User and CRMMessage models
  };

  return UserCRMMessage;
};
