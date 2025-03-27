// models/PokerHandAction.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const PokerHandAction = sequelize.define('PokerHandAction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    hand_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'poker_hands',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    betting_round: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    position: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    action_type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    pot_size_before: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    opponent_action_before: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    hand_strength: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    action_timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'poker_hand_actions',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  PokerHandAction.associate = function(models) {
    PokerHandAction.belongsTo(models.PokerHand, {
      foreignKey: 'hand_id',
      onDelete: 'CASCADE'
    });
    PokerHandAction.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE'
    });
  };

  return PokerHandAction;
};
