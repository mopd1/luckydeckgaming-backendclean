// models/package.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const Package = sequelize.define('Package', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    chips: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    gems: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'packages',
    timestamps: true
  });

  Package.associate = function(models) {
    // Define associations here if needed
  };

  return Package;
};
