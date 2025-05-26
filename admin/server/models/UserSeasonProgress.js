'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserSeasonProgress = sequelize.define('UserSeasonProgress', {
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
    season_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      references: {
        model: 'season_passes',
        key: 'season_id'
      }
    },
    has_inside_track: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    claimed_milestones: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    }
  }, {
    tableName: 'user_season_progress',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  UserSeasonProgress.associate = function(models) {
    UserSeasonProgress.belongsTo(models.User, {
      foreignKey: 'user_id'
    });
    
    UserSeasonProgress.belongsTo(models.SeasonPass, {
      foreignKey: 'season_id',
      targetKey: 'season_id'
    });
  };

  return UserSeasonProgress;
};
