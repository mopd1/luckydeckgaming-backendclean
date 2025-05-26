'use strict';

module.exports = (sequelize, DataTypes) => {
  const MilestoneReward = sequelize.define('MilestoneReward', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    milestone_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: {
        model: 'season_milestones',
        key: 'milestone_id'
      }
    },
    track_type: {
      type: DataTypes.ENUM('free', 'paid'),
      allowNull: false
    },
    reward_type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    reward_amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    display_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'milestone_rewards',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  MilestoneReward.associate = function(models) {
    MilestoneReward.belongsTo(models.SeasonMilestone, {
      foreignKey: 'milestone_id',
      targetKey: 'milestone_id'
    });
  };

  return MilestoneReward;
};
