const jwt = require('jsonwebtoken');

const JWT_SECRET = 'PUt7F<D\\!=K%hf{C8mv?_z';

// Create a test admin token
const payload = {
  userId: 1,
  username: 'admin',
  email: 'admin@test.com',
  role: 'admin'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('JWT Token:');
console.log(token);
console.log('\nUse this token in your curl commands like:');
console.log(`curl -H "Authorization: Bearer ${token}" http://your-admin-url/api/dashboard/stats`);
