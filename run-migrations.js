// run-migrations.js
const { exec } = require('child_process');

console.log('Running database migrations...');

exec('npx sequelize-cli db:migrate', (error, stdout, stderr) => {
  if (error) {
    console.error(`Migration error: ${error}`);
    return;
  }
  console.log(`Migration output: ${stdout}`);
  if (stderr) {
    console.error(`Migration stderr: ${stderr}`);
  }
  console.log('Migrations completed!');
  process.exit(0);
});
