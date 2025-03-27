'use strict';
module.exports = (sequelize, DataTypes) => {
  const UserStatus = sequelize.define('UserStatus', {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('online', 'offline', 'away'),
      allowNull: false,
      defaultValue: 'offline'
    },
    last_active: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'UserStatus'
  });

  UserStatus.associate = function(models) {
    UserStatus.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'CASCADE'
    });
  };

  return UserStatus;
};
