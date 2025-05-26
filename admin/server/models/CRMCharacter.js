// models/CRMCharacter.js
'use strict';

module.exports = (sequelize, DataTypes) => {
  const CRMCharacter = sequelize.define('CRMCharacter', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    avatar_data: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'crm_characters',
    timestamps: true,
    underscored: true
  });

  CRMCharacter.associate = function(models) {
    CRMCharacter.hasMany(models.CRMMessage, {
      foreignKey: 'character_id'
    });
  };

  return CRMCharacter;
};
