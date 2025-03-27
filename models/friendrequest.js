'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FriendRequest extends Model {
    static associate(models) {
      FriendRequest.belongsTo(models.User, { 
        foreignKey: 'senderId',
        as: 'Sender'
      });
      FriendRequest.belongsTo(models.User, { 
        foreignKey: 'receiverId',
        as: 'Receiver'
      });
    }
  }
  
  FriendRequest.init({
    senderId: DataTypes.INTEGER,
    receiverId: DataTypes.INTEGER,
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending'
    }
  }, {
    sequelize,
    modelName: 'FriendRequest',
  });
  
  return FriendRequest;
};
