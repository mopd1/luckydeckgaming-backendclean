require('dotenv').config({ path: process.env.NODE_ENV === 'aws' ? '.env.aws' : '.env' });

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASS:', process.env.DB_PASS?.substring(0, 3) + '***');
console.log('DB_NAME:', process.env.DB_NAME);
