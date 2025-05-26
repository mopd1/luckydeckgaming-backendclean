'use strict';
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    from_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('friend_request', 'message', 'friend_accept'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('unread', 'read'),
      allowNull: false,
      defaultValue: 'unread'
    }
  }, {
    tableName: 'Notifications',
    indexes: [
      {
        fields: ['user_id', 'status', 'createdAt'],
        name: 'idx_notifications_user_status'
      }
    ]
  });

  Notification.associate = function(models) {
    Notification.belongsTo(models.User, {
      as: 'User',
      foreignKey: 'user_id'
    });
    Notification.belongsTo(models.User, {
      as: 'FromUser',
      foreignKey: 'from_user_id'
    });
  };

  return Notification;
};
