#!/bin/bash
set -e

echo "Starting frontend build process..."
echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Check if we're in the right location
if [ -d "/var/app/current/admin/frontend" ]; then
    echo "Found admin/frontend directory"
    cd /var/app/current/admin/frontend
elif [ -d "frontend" ]; then
    echo "Found frontend directory in current path"
    cd frontend
elif [ -d "../frontend" ]; then
    echo "Found frontend directory one level up"
    cd ../frontend
else
    echo "ERROR: Cannot find frontend directory"
    echo "Searching for frontend directories:"
    find /var/app/current -name "frontend" -type d 2>/dev/null || echo "No frontend directories found"
    exit 1
fi

echo "Installing dependencies..."
npm ci

echo "Building frontend..."
npm run build

echo "Build completed successfully!"
ls -la dist/

# Ensure proper permissions
chmod -R 755 dist/

echo "Frontend build process completed!"
