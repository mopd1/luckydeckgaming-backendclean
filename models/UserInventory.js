'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserInventory = sequelize.define('UserInventory', {
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
    item_type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    item_id: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'user_inventory',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  UserInventory.associate = function(models) {
    UserInventory.belongsTo(models.User, {
      foreignKey: 'user_id'
    });
  };

  return UserInventory;
};
