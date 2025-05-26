'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Game extends Model {
    static associate(models) {
      Game.hasMany(models.GameSession, { foreignKey: 'game_id' });
    }
  }

  Game.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      format: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      rake_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      rake_cap: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      percent_of_field_paid: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      min_players: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      max_players: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      min_stake: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      max_stake: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Game',
      tableName: 'Games',
    }
  );

  return Game;
};
