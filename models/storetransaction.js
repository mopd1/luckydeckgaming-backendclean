'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StoreTransaction extends Model {
    static associate(models) {
      StoreTransaction.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }

  StoreTransaction.init(
    {
      transaction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'User', // Adjust table name if necessary
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      chip_spend: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      gem_spend: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      part_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'AvatarPart', // Adjust table name if necessary
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      // New fields
      chips_added: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      gems_added: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      apple_product_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      apple_transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      }
     },
    {
      sequelize,
      modelName: 'StoreTransaction',
      tableName: 'StoreTransactions',
      indexes: [
        {
          fields: ['user_id', 'type', 'timestamp']
        }
      ]
    }
  );

  return StoreTransaction;
};
