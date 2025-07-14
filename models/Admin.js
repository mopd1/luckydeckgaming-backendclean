'use strict';

const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    static associate(models) {
      // define associations here
    }
  }

  Admin.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('superadmin', 'admin', 'moderator'),
      defaultValue: 'admin'
    },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    lastLogin: {
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'Admin',
    hooks: {
      beforeCreate: async (admin) => {
        admin.password = await bcrypt.hash(admin.password, 10);
      },
      beforeUpdate: async (admin) => {
        if (admin.changed('password')) {
          admin.password = await bcrypt.hash(admin.password, 10);
        }
      }
    }
  });

  Admin.prototype.verifyPassword = async function(password) {
    return bcrypt.compare(password, this.password);
  };

  return Admin;
};
