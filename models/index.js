'use strict';
const { Sequelize, DataTypes } = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config.json')[env];
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: (msg) => console.log(msg)
  }
);
const db = {};

// Import models manually
db.Admin = require('./Admin')(sequelize, DataTypes);
db.User = require('./User')(sequelize, DataTypes);
db.PokerHand = require('./PokerHand')(sequelize, DataTypes);
db.BlackjackHand = require('./BlackjackHand')(sequelize, DataTypes);
db.TaskAction = require('./TaskAction')(sequelize, DataTypes);
db.DailyTask = require('./DailyTask')(sequelize, DataTypes);
db.TaskSet = require('./TaskSet')(sequelize, DataTypes);
db.TaskSetTasks = require('./TaskSetTasks')(sequelize, DataTypes);
db.TaskCalendar = require('./TaskCalendar')(sequelize, DataTypes);
db.UserTaskProgress = require('./UserTaskProgress')(sequelize, DataTypes);
db.UserDailyReset = require('./UserDailyReset')(sequelize, DataTypes);
db.PlayerGrading = require('./PlayerGrading')(sequelize, Sequelize.DataTypes);
db.SeasonPass = require('./SeasonPass')(sequelize, Sequelize.DataTypes);
db.SeasonMilestone = require('./SeasonMilestone')(sequelize, Sequelize.DataTypes);
db.UserSeasonProgress = require('./UserSeasonProgress')(sequelize, Sequelize.DataTypes);
db.UserInventory = require('./UserInventory')(sequelize, Sequelize.DataTypes);
// Add the new Package model
db.Package = require('./package')(sequelize, Sequelize.DataTypes);

// Initialize associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Test the connection
sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
