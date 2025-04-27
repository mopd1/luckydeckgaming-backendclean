module.exports = (sequelize, DataTypes) => {
  const DailyLeaderboard = sequelize.define('DailyLeaderboard', {
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
    leaderboard_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    score: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0
    },
    date_period: {
      type: DataTypes.DATEONLY,
      allowNull: false
    }
  }, {
    tableName: 'daily_leaderboards',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  DailyLeaderboard.associate = function(models) {
    DailyLeaderboard.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return DailyLeaderboard;
};
