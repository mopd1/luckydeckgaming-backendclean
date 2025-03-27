'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RevenueTransaction extends Model {
    static associate(models) {
      RevenueTransaction.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }

  RevenueTransaction.init(
    {
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: 'User', // Replace with your actual Users table name if different
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'RevenueTransaction',
      tableName: 'RevenueTransactions',
    }
  );

  return RevenueTransaction;
};
