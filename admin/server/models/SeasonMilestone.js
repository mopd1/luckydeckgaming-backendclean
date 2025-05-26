'use strict';

module.exports = (sequelize, DataTypes) => {
  const SeasonMilestone = sequelize.define('SeasonMilestone', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    milestone_id: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    season_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: {
        model: 'season_passes',
        key: 'season_id'
      }
    },
    milestone_number: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    required_points: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    free_reward_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'chips'
    },
    free_reward_amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    paid_reward_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'chips'
    },
    paid_reward_amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'season_milestones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  SeasonMilestone.associate = function(models) {
    SeasonMilestone.belongsTo(models.SeasonPass, {
      foreignKey: 'season_id',
      targetKey: 'season_id'
    });

  // SeasonMilestone.hasMany(models.MilestoneReward, {
    // foreignKey: 'milestone_id',
    // sourceKey: 'milestone_id'
    // });
  };

  return SeasonMilestone;
};
