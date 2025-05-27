const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function createAdminServiceUser() {
  try {
    console.log('Creating admin service user...');
    
    // Create or find admin service user
    const [adminUser, created] = await User.findOrCreate({
      where: { username: 'admin-service' },
      defaults: {
        username: 'admin-service',
        email: 'admin-service@luckydeckgaming.com',
        password: await bcrypt.hash('secure-random-password-' + Date.now(), 10),
        is_admin: true,
        is_active: true,
        display_name: 'Admin Service User'
      }
    });

    console.log(created ? 'Admin service user created' : 'Admin service user already exists');
    console.log('User ID:', adminUser.id);
    
    // Generate long-lived token
    const token = jwt.sign(
      {
        id: adminUser.id,
        username: adminUser.username,
        is_admin: true,
        type: 'service'
      },
      process.env.JWT_SECRET,
      { expiresIn: '2y' } // 2 year expiry
    );

    console.log('\n=== COPY THESE VALUES TO AWS EB ENVIRONMENT VARIABLES ===');
    console.log(`MAIN_API_URL=https://api.luckydeckgaming.com/api/daily-tasks`);
    console.log(`MAIN_API_TOKEN=${token}`);
    console.log('=========================================================\n');
    
    return { user: adminUser, token };
  } catch (error) {
    console.error('Error creating admin service user:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createAdminServiceUser()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = createAdminServiceUser;
