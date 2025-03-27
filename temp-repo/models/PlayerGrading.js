// models/PlayerGrading.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const PlayerGrading = sequelize.define('PlayerGrading', {
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
    overall_score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    hand_selection_score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    betting_strategy_score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    positional_awareness_score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    post_flop_decision_score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    bluffing_effectiveness_score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    discipline_score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    opponent_adaptation_score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    bankroll_management_score: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    hands_analyzed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_reset_time: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reset_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    privacy_settings: {
      type: DataTypes.JSON,
      get() {
        const value = this.getDataValue('privacy_settings');
        return value ? JSON.parse(value) : {
          show_overall_score: true,
          show_category_scores: true,
          show_hands_played: true,
          show_win_rate: true
        };
      },
      set(value) {
        this.setDataValue('privacy_settings', JSON.stringify(value));
      }
    }
  }, {
    tableName: 'player_gradings',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  PlayerGrading.associate = function(models) {
    PlayerGrading.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE'
    });
  };

  return PlayerGrading;
};
