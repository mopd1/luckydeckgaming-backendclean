const sequelize = require('./config/database');

async function testUsersTable() {
  try {
    await sequelize.authenticate();
    console.log('Connection established successfully.');
    
    // Query the Users table
    const [users] = await sequelize.query('SELECT COUNT(*) as userCount FROM Users');
    console.log('User count:', users[0].userCount);
    
    // Get table schema
    const [columns] = await sequelize.query('DESCRIBE Users');
    console.log('Users table columns:');
    columns.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

testUsersTable();
