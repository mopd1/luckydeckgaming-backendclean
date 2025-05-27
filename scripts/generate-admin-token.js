const jwt = require('jsonwebtoken');

// Get JWT secret from environment or prompt user
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('Please run this command with your JWT_SECRET:');
  console.error('JWT_SECRET="your-secret-here" node scripts/generate-admin-token.js');
  console.error('');
  console.error('You can find your JWT_SECRET in AWS EB Console:');
  console.error('1. Go to your main backend EB environment');
  console.error('2. Configuration → Software → Environment properties');
  console.error('3. Look for JWT_SECRET value');
  process.exit(1);
}

// Create admin token payload
const adminPayload = {
  id: 1, // Using ID 1 for admin service user
  username: 'admin-proxy',
  is_admin: true,
  type: 'service'
};

try {
  // Generate long-lived token
  const token = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '2y' });

  console.log('\n✅ Daily Tasks Admin token generated successfully!');
  console.log('\n=== ADD THESE TO AWS EB ADMIN SERVER ENVIRONMENT VARIABLES ===');
  console.log(`DAILY_TASKS_API_URL=https://api.luckydeckgaming.com/api/daily-tasks`);
  console.log(`DAILY_TASKS_API_TOKEN=${token}`);
  console.log('================================================================\n');
  
  console.log('Token details:');
  console.log('- Payload:', JSON.stringify(adminPayload, null, 2));
  console.log('- Expires: 2 years from now');
  console.log('- Length:', token.length, 'characters');
  
  console.log('\nNext steps:');
  console.log('1. Copy the DAILY_TASKS_API_TOKEN value above');
  console.log('2. Add both environment variables to your admin server EB configuration:');
  console.log('   - DAILY_TASKS_API_URL');
  console.log('   - DAILY_TASKS_API_TOKEN');
  console.log('3. Deploy your admin server');
  console.log('4. Test the admin interface Daily Tasks tab');
  console.log('5. Verify the action type dropdown populates correctly');

} catch (error) {
  console.error('Error generating token:', error.message);
  process.exit(1);
}
