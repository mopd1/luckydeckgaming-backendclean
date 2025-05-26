'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserGameSession extends Model {
    static associate(models) {
      UserGameSession.belongsTo(models.User, { foreignKey: 'user_id' });
      UserGameSession.belongsTo(models.GameSession, { foreignKey: 'session_id' });
    }
  }

  UserGameSession.init(
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
      session_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'GameSession', // Replace with your actual GameSessions table name if different
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      buy_in: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      cash_out: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      rake_paid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      challenge_points_earned: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      milestones_reached: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      free_chips_taken: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      purchases: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      chips_purchased: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      revenue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      poker_hands_played: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sngs_played: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      tournaments_played: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      blackjack_hands_played: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      slot_spins: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      avatar_parts_purchased: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      packages_purchased: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      avatars_confirmed: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'UserGameSession',
      tableName: 'UserGameSessions',
    }
  );

  return UserGameSession;
};
