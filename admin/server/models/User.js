'use strict';
const { Model } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Keep existing associations
      if (models.UserGameSession) {
        User.hasMany(models.UserGameSession, { foreignKey: 'user_id' });
      }
      if (models.RevenueTransaction) {
        User.hasMany(models.RevenueTransaction, { foreignKey: 'user_id' });
      }
      if (models.StoreTransaction) {
        User.hasMany(models.StoreTransaction, { foreignKey: 'user_id' });
      }
      if (models.AvatarPart) {
        User.belongsToMany(models.AvatarPart, {
          through: 'UserAvatarPart',
          foreignKey: 'user_id',
        });
      }
      if (models.UserStatus) {
        User.hasOne(models.UserStatus, {
          foreignKey: 'user_id',
          as: 'Status'
        });
      }
      
      // New association for player grading
      if (models.PlayerGrading) {
        User.hasOne(models.PlayerGrading, {
          foreignKey: 'user_id',
          as: 'grading'
        });
      }
    }

    generateToken() {
      return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
        expiresIn: '1h'
      });
    }

    generateRefreshToken() {
      return jwt.sign({ id: this.id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d'
      });
    }

    async validatePassword(password) {
      return bcrypt.compare(password, this.password);  // Changed from password_hash
    }

    toJSON() {
      const values = { ...this.get() };
      delete values.password;  // Changed from password_hash
      return values;
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    display_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    surname: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {  // Changed from password_hash
      type: DataTypes.STRING(255),
      allowNull: false
    },
    welcome_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    balance: {  // Changed from chips
      type: DataTypes.BIGINT,
      defaultValue: 0
    },
    gems: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    action_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    admin_role: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    account_locked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    account_locked_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    avatar_data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    language_preference: {
      type: DataTypes.STRING(10),
      defaultValue: 'en',
      allowNull: true
    },
    owned_avatar_parts: {
      type: DataTypes.JSON,
      allowNull: true
    },
    has_composite_avatar: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',  // Changed to lowercase
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {  // Changed from password_hash
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {  // Changed from password_hash
          user.password = await bcrypt.hash(user.password, 10);
        }
      }
    }
  });

  return User;
};
