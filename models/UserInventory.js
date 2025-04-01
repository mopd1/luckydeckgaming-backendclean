// models/UserInventory.js
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
      type: DataTypes.STRING,
      allowNull: false
    },
    item_id: {
      type: DataTypes.STRING,
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
    updatedAt: 'updated_at',
  });

  UserInventory.associate = (models) => {
    UserInventory.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return UserInventory;
};
