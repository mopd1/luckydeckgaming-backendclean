const jwt = require('jsonwebtoken');

const JWT_SECRET = 'PUt7F<D\\!=K%hf{C8mv?_z';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NDgzMzgzMzQsImV4cCI6MTc0ODQyNDczNH0.9sYlTFco8f92Xju2yqkX3YfG89pBMaECwvtNVF115AE';

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ JWT verification SUCCESS');
  console.log('Decoded payload:', decoded);
} catch (error) {
  console.log('❌ JWT verification FAILED');
  console.log('Error:', error.message);
  
  // Try with different secrets
  console.log('\nTrying alternative secrets...');
  const alternatives = [
    'your-secret-key',
    process.env.JWT_SECRET,
    'PUt7F<D!=K%hf{C8mv?_z'  // Without escaping
  ];
  
  alternatives.forEach((secret, i) => {
    try {
      const decoded = jwt.verify(token, secret);
      console.log(`✅ SUCCESS with alternative ${i + 1}: ${secret}`);
      console.log('Decoded:', decoded);
    } catch (err) {
      console.log(`❌ Failed with alternative ${i + 1}: ${secret}`);
    }
  });
}
