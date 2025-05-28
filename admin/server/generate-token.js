const jwt = require('jsonwebtoken');

const JWT_SECRET = 'PUt7F<D\\!=K%hf{C8mv?_z'; // Your actual secret

const payload = {
  id: 1,  // Changed from userId to id to match middleware
  username: 'admin',
  email: 'admin@test.com',
  role: 'admin'
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

console.log('JWT Token with correct field name:');
console.log(token);
