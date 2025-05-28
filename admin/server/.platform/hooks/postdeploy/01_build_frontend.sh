#!/bin/bash
echo "Building frontend after deployment..."
cd /var/app/current/admin/frontend

# Install frontend dependencies
npm install --production

# Build the frontend
npm run build

echo "Frontend build complete!"
ls -la dist/
