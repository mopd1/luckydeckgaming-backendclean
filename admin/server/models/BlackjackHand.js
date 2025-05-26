'use strict';

console.log('Initializing BlackjackHand model...');

module.exports = (sequelize, DataTypes) => {
  const BlackjackHand = sequelize.define('BlackjackHand', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,  // Changed to match DB
      references: {
        model: 'users',
        key: 'id'
      }
    },
    table_id: {
      type: DataTypes.STRING(255),  // Match DB type
      allowNull: true  // Changed to match DB
    },
    hand_number: {
      type: DataTypes.INTEGER,
      allowNull: true  // Changed to match DB
    },
    stake_level: {
      type: DataTypes.INTEGER,
      allowNull: true  // Changed to match DB
    },
    player_cards: {
      type: DataTypes.TEXT,
      allowNull: true,  // Changed to match DB
      get() {
        const value = this.getDataValue('player_cards');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('player_cards', JSON.stringify(value));
      }
    },
    dealer_cards: {
      type: DataTypes.TEXT,
      allowNull: true,  // Changed to match DB
      get() {
        const value = this.getDataValue('dealer_cards');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('dealer_cards', JSON.stringify(value));
      }
    },
    // split_hands is missing in DB, so we'll handle it in the route
    initial_bet: {
      type: DataTypes.INTEGER,
      allowNull: true  // Changed to match DB
    },
    insurance_bet: {
      type: DataTypes.INTEGER,
      allowNull: true,  // Changed to match DB
      defaultValue: 0
    },
    outcome: {
      type: DataTypes.STRING(255),  // Match DB type
      allowNull: true  // Changed to match DB
    },
    payout: {
      type: DataTypes.INTEGER,
      allowNull: true  // Changed to match DB
    },
    doubled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,  // Changed to match DB
      defaultValue: false
    },
    surrendered: {
      type: DataTypes.BOOLEAN,
      allowNull: true,  // Changed to match DB
      defaultValue: false
    },
    split: {
      type: DataTypes.BOOLEAN,
      allowNull: true,  // Changed to match DB
      defaultValue: false
    },
    played_at: {
      type: DataTypes.DATE,
      allowNull: true,  // Changed to match DB
      defaultValue: DataTypes.NOW
    },
    // Required timestamp fields
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    streak_multiplier_applied: {
      type: DataTypes.BOOLEAN,
      allowNull: true,  // Changed to match DB
      defaultValue: false
    },
    streak_count: {
      type: DataTypes.INTEGER,
      allowNull: true,  // Changed to match DB
      defaultValue: 0
    }
  }, {
    tableName: 'BlackjackHands',  // Match the capitalization in your database
    timestamps: true
  });

  BlackjackHand.associate = function(models) {
    BlackjackHand.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE'
    });
  };
  
  console.log('BlackjackHand model initialized with tableName:', BlackjackHand.tableName);
  
  return BlackjackHand;
};
