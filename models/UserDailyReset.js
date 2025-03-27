// File: models/UserDailyReset.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserDailyReset = sequelize.define('UserDailyReset', {
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
    reset_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  }, {
    tableName: 'user_daily_resets',
    timestamps: true
  });

  UserDailyReset.associate = function(models) {
    UserDailyReset.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE'
    });
  };

  return UserDailyReset;
};
