'use strict';
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    receiver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'read'),
      allowNull: false,
      defaultValue: 'sent'
    }
  }, {
    tableName: 'Messages',
    indexes: [
      {
        fields: ['createdAt'],
        name: 'idx_messages_timestamp'
      },
      {
        fields: ['receiver_id', 'status', 'createdAt'],
        name: 'idx_messages_receiver_status'
      }
    ]
  });

  Message.associate = function(models) {
    Message.belongsTo(models.User, {
      as: 'Sender',
      foreignKey: 'sender_id'
    });
    Message.belongsTo(models.User, {
      as: 'Receiver',
      foreignKey: 'receiver_id'
    });
  };

  return Message;
};
