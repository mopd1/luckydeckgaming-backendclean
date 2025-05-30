// admin/server/models/Admin.js
'use strict';

const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    static associate(models) {
      // No associations needed for this simplified approach if not using AdminRole/AdminPermission models
      // for permission checking.
      // If you still want to link Admin.role (string) to AdminRole.role_name (string) for fetching
      // role descriptions, you can keep this:
      // Admin.belongsTo(models.AdminRole, {
      //   foreignKey: 'role',
      //   targetKey: 'role_name',
      //   as: 'roleDetails'
      // });
    }
  }

  Admin.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50), // From DB
      unique: true,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING(255), // From DB
      allowNull: false
    },
    role: { // Stores 'admin', 'superadmin', etc.
      type: DataTypes.STRING(20),   // From DB (was varchar(20))
      allowNull: false,
      defaultValue: 'admin'
    },
    lastLogin: {
      type: DataTypes.DATE,
      field: 'last_login' // Maps to last_login column
    },
    isActive: { // Field from DB
      type: DataTypes.BOOLEAN, // Sequelize maps to tinyint(1)
      defaultValue: true,
      field: 'is_active' // Maps to is_active column
    }
    // Sequelize handles createdAt and updatedAt if timestamps: true and columns are created_at, updated_at
  }, {
    sequelize,
    modelName: 'Admin',
    tableName: 'admin_users',
    timestamps: true, // Assumes created_at and updated_at columns exist
    underscored: true, // Important if your DB columns are snake_case (e.g. last_login)
    hooks: {
      beforeCreate: async (admin) => {
        if (admin.password) {
          admin.password = await bcrypt.hash(admin.password, 10);
        }
      },
      beforeUpdate: async (admin) => {
        if (admin.changed('password') && admin.password) {
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
