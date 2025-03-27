const { Sequelize } = require('sequelize');
const config = require('dotenv').config();
// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || 'lucky_deck_gaming',
  process.env.DB_USER || 'david',
  process.env.DB_PASSWORD || 'OMGunibet2025##',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mariadb',
    port: process.env.DB_PORT || 3306,
    logging: console.log
  }
);
// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}
testConnection();
// Define models
const models = {
  sequelize,
  Sequelize
};
// Define User model with complete schema
models.User = sequelize.define('User', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: Sequelize.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: Sequelize.STRING(255),
    allowNull: false,
    unique: true
  },
  password: {
    type: Sequelize.STRING(255),
    allowNull: false
  },
  created_at: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  },
  updated_at: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  },
  is_active: {
    type: Sequelize.BOOLEAN,
    defaultValue: 1
  },
  balance: {
    type: Sequelize.BIGINT,
    defaultValue: 0
  },
  gems: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  is_admin: {
    type: Sequelize.BOOLEAN,
    defaultValue: 0
  },
  admin_role: {
    type: Sequelize.STRING(50),
    allowNull: true
  },
  last_login: {
    type: Sequelize.DATE,
    allowNull: true
  },
  failed_login_attempts: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  account_locked: {
    type: Sequelize.BOOLEAN,
    defaultValue: 0
  },
  account_locked_until: {
    type: Sequelize.DATE,
    allowNull: true
  },
  display_name: {
    type: Sequelize.STRING(50),
    allowNull: true
  },
  welcome_completed: {
    type: Sequelize.BOOLEAN,
    defaultValue: 0
  },
  avatar_data: {
    type: Sequelize.TEXT('long'),
    allowNull: true
  },
  owned_avatar_parts: {
    type: Sequelize.TEXT('long'),
    allowNull: true
  },
  first_name: {
    type: Sequelize.STRING(50),
    allowNull: true
  },
  surname: {
    type: Sequelize.STRING(50),
    allowNull: true
  },
  nickname: {
    type: Sequelize.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: false,
  underscored: true,
});

module.exports = models;
