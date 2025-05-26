'use strict';

module.exports = (sequelize, DataTypes) => {
  const SeasonPass = sequelize.define('SeasonPass', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    season_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'season_passes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  SeasonPass.associate = function(models) {
    SeasonPass.hasMany(models.SeasonMilestone, {
      foreignKey: 'season_id',
      sourceKey: 'season_id'
    });
    
    SeasonPass.hasMany(models.UserSeasonProgress, {
      foreignKey: 'season_id',
      sourceKey: 'season_id'
    });
    
    SeasonPass.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return SeasonPass;
};
