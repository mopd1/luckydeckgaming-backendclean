'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AvatarPart extends Model {
    static associate(models) {
      AvatarPart.belongsToMany(models.User, {
        through: 'UserAvatarPart',
        foreignKey: 'part_id',
        otherKey: 'user_id',
      });
      AvatarPart.hasMany(models.StoreTransaction, { foreignKey: 'part_id' });
    }
  }

  AvatarPart.init(
    {
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      image_path: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'AvatarPart',
      tableName: 'AvatarParts', // Adjust if your table name differs
    }
  );

  return AvatarPart;
};
