#!/bin/bash
echo "Building frontend from root..."
cd /var/app/current/admin/frontend

# Install and build
npm install
npm run build

echo "Frontend build complete!"
ls -la dist/
