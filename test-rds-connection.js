const sequelize = require('./config/database');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Connection to RDS has been established successfully.');
    
    // Get existing tables (if any)
    const [results] = await sequelize.query('SHOW TABLES');
    console.log('Current tables in database:');
    results.forEach(row => {
      console.log(`- ${Object.values(row)[0]}`);
    });
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

testConnection();
