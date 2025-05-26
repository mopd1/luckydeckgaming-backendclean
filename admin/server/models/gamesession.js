'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GameSession extends Model {
    static associate(models) {
      GameSession.belongsTo(models.Game, { foreignKey: 'game_id' });
      GameSession.hasMany(models.UserGameSession, { foreignKey: 'session_id' });
    }
  }

  GameSession.init(
    {
      game_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Game', // Should match the table name or model name
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      stake: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'GameSession',
      tableName: 'GameSessions',
      // Additional model options can go here
    }
  );

  return GameSession;
};
