#!/bin/bash
echo "Verifying deployed files..."
echo "CORS file content:"
cat /var/app/current/config/cors.js
echo "Node.js version:"
node -v
echo "Environment variables:"
env | grep -E "PORT|NODE_ENV|DB_|REDIS_|JWT_"
echo "File verification complete."
chmod +x .platform/hooks/postdeploy/99_check_files.sh
