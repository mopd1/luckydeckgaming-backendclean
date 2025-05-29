#!/bin/bash
set -e

echo "=== Starting Frontend Build Process ==="
echo "Current directory: $(pwd)"
echo "Current user: $(whoami)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Navigate to frontend directory
FRONTEND_DIR="/var/app/current/admin/frontend"
echo "Looking for frontend directory at: $FRONTEND_DIR"

if [ -d "$FRONTEND_DIR" ]; then
    echo "✓ Found admin frontend directory"
    cd "$FRONTEND_DIR"
    echo "Current directory after cd: $(pwd)"
    echo "Directory contents:"
    ls -la
else
    echo "✗ ERROR: Cannot find frontend directory at: $FRONTEND_DIR"
    echo "Available directories in /var/app/current/:"
    ls -la /var/app/current/
    echo "Available directories in /var/app/current/admin/:"
    ls -la /var/app/current/admin/ 2>/dev/null || echo "No admin directory found"
    exit 1
fi

echo "=== Installing Dependencies ==="
# Install ALL dependencies (including devDependencies needed for build)
npm ci --include=dev

echo "=== Checking if build tools are available ==="
# Check if vite is available
if [ -f "node_modules/.bin/vite" ]; then
    echo "✓ Vite found at node_modules/.bin/vite"
elif [ -f "../../node_modules/.bin/vite" ]; then
    echo "✓ Vite found at ../../node_modules/.bin/vite"  
else
    echo "⚠ Vite not found, listing available binaries:"
    ls -la node_modules/.bin/ | head -10
fi

echo "=== Building Frontend ==="
# Run build through npm script (this will use the local vite)
npm run build

if [ $? -eq 0 ]; then
    echo "✓ Build completed successfully!"
    
    if [ -d "dist" ]; then
        echo "✓ Dist directory created"
        echo "Dist contents:"
        ls -la dist/
        
        # Ensure proper permissions
        chmod -R 755 dist/
        echo "✓ Permissions set"
    else
        echo "✗ ERROR: dist directory not created"
        exit 1
    fi
else
    echo "✗ ERROR: Build failed"
    exit 1
fi

echo "=== Frontend Build Process Complete ==="
