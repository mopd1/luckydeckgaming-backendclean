'use strict';

module.exports = (sequelize, DataTypes) => {
  const PokerHand = sequelize.define('PokerHand', {
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
      table_id: {
          type: DataTypes.STRING(50),
          allowNull: false
      },
      hand_number: {
          type: DataTypes.INTEGER,
          allowNull: false
      },
      stake_level: {
          type: DataTypes.INTEGER,
          allowNull: false
      },
      game_type: {
          type: DataTypes.STRING(20),
          defaultValue: 'texas_holdem'
      },
      player_cards: {
          type: DataTypes.TEXT,
          get() {
              const value = this.getDataValue('player_cards');
              return value ? JSON.parse(value) : [];
          },
          set(value) {
              this.setDataValue('player_cards', JSON.stringify(value));
          }
      },
      community_cards: {
          type: DataTypes.TEXT,
          get() {
              const value = this.getDataValue('community_cards');
              return value ? JSON.parse(value) : [];
          },
          set(value) {
              this.setDataValue('community_cards', JSON.stringify(value));
          }
      },
      pot_size: {
          type: DataTypes.INTEGER,
          allowNull: false
      },
      hand_strength: {
          type: DataTypes.STRING(50)
      },
      result: {
          type: DataTypes.STRING(20),
          allowNull: false
      },
      chips_won: {
          type: DataTypes.INTEGER,
          defaultValue: 0
      },
      rake: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          comment: 'The amount of rake collected from this hand'
      },
      rake_eligible: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          comment: 'Whether this hand was eligible for rake (reached the flop)'
      },
      pot_before_rake: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          comment: 'The total pot amount before rake was deducted'
      },
      position: {
          type: DataTypes.STRING(15),
          allowNull: true,
          comment: 'Player position at table (early, middle, late, blinds)'
      },
      preflop_action: {
          type: DataTypes.STRING(20),
          allowNull: true,
          comment: 'First action preflop (fold, check, call, raise)'
      },
      stack_size_before: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Player stack size before hand started'
      },
      rounds_played: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Number of betting rounds played (1-4)'
      },
      total_balance_before_buyin: {
          type: DataTypes.BIGINT,
          allowNull: true,
          comment: 'Player total balance before buying into table'
      },
      buyin_amount: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Amount of chips bought into table'
      },
      played_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW
      }
  }, {
      tableName: 'poker_hands',
      timestamps: false
  });

  // Define associations
  PokerHand.associate = function(models) {
    // Existing association
    PokerHand.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE'
    });
    
    // New association for hand actions
    if (models.PokerHandAction) {
      PokerHand.hasMany(models.PokerHandAction, {
        foreignKey: 'hand_id',
        onDelete: 'CASCADE'
      });
    }
  };

  return PokerHand;
};
