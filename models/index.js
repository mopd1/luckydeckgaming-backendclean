'use strict';
const { Sequelize, DataTypes } = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const configFile = require('../config/config.json');
const config = configFile[env] || configFile['development'];

// Override with environment variables if available
const dbName = process.env.DB_NAME || config.database;
const dbUser = process.env.DB_USER || config.username;
const dbPass = process.env.DB_PASS || config.password;
const dbHost = process.env.DB_HOST || config.host;
const dbPort = process.env.DB_PORT || config.port || 3306;
const dbDialect = config.dialect || 'mysql';

console.log(`Database connection to ${dbHost}:${dbPort} using ${dbDialect}`);

const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPass,
  {
    host: dbHost,
    port: dbPort,
    dialect: dbDialect,
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
db.Package = require('./package')(sequelize, Sequelize.DataTypes);
db.CRMCharacter = require('./CRMCharacter')(sequelize, DataTypes);
db.CRMMessage = require('./CRMMessage')(sequelize, DataTypes);
db.UserCRMMessage = require('./UserCRMMessage')(sequelize, DataTypes);
db.StoreTransaction = require('./storetransaction')(sequelize, DataTypes);
db.RevenueTransaction = require('./revenuetransaction')(sequelize, DataTypes);
db.DailyLeaderboard = require('./DailyLeaderboard')(sequelize, DataTypes);

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
