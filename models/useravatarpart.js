'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserAvatarPart extends Model {
    static associate(models) {
      // Define associations here
      UserAvatarPart.belongsTo(models.User, { foreignKey: 'user_id' });
      UserAvatarPart.belongsTo(models.AvatarPart, { foreignKey: 'part_id' });
    }
  }

  UserAvatarPart.init(
    {
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'User', // Adjust if your table name is different
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      part_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'AvatarPart', // Adjust if your table name is different
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      acquired_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
      },
      times_confirmed: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'UserAvatarPart',
      tableName: 'UserAvatarParts', // Adjust if necessary
    }
  );

  return UserAvatarPart;
};
