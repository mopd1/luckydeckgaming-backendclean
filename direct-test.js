// Skip dotenv and just use hardcoded values
const { Sequelize } = require('sequelize');

async function testConnection() {
  // Create Sequelize instance with explicit credentials
  const sequelize = new Sequelize('lucky_deck_gaming', 'luckydeck_admin', 'OMGunibet2025##', {
    host: process.env.DB_HOST || 'luckydeck-db-uswest2.crm8qyscuo8a.us-west-2.rds.amazonaws.com',
    dialect: 'mysql'
  });

  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    // Test a simple query
    const [results] = await sequelize.query('SELECT 1+1 as result');
    console.log('Query result:', results);
    
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

testConnection();
