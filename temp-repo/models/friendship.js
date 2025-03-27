'use strict';
module.exports = (sequelize, DataTypes) => {
  const Friendship = sequelize.define('Friendship', {
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
    friend_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    }
  }, {
    tableName: 'Friendships',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'friend_id'],
        name: 'friendship_user_friend_unique'
      }
    ]
  });

  Friendship.associate = function(models) {
    Friendship.belongsTo(models.User, {
      as: 'User',
      foreignKey: 'user_id'
    });
    Friendship.belongsTo(models.User, {
      as: 'Friend',
      foreignKey: 'friend_id'
    });
  };

  return Friendship;
};
