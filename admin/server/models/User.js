module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: 1
    },
    balance: {
      type: DataTypes.BIGINT,
      defaultValue: 0
    },
    gems: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0
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
      defaultValue: 0
    },
    account_locked_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    display_name: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    welcome_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0
    },
    avatar_data: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    owned_avatar_parts: {
      type: DataTypes.TEXT('long'),
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
    }
  }, {
    tableName: 'users',
    timestamps: false
  });

  return User;
};
