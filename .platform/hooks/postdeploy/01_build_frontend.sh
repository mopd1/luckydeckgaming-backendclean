#!/bin/bash
echo "=== Frontend Build Process Starting ==="

# Set Node.js version and environment
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=1024"

# Navigate to frontend directory
cd /var/app/current/admin/frontend

echo "Current directory: $(pwd)"
echo "Contents:"
ls -la

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "ERROR: No package.json found!"
    exit 1
fi

echo "=== Installing Frontend Dependencies ==="
# Install dependencies with specific flags for production
npm ci --only=production --silent || npm install --production --silent

echo "=== Running Frontend Build ==="
# Run the build command
if npm run build; then
    echo "=== Build Successful ==="
    
    # Check if dist directory was created
    if [ -d "dist" ]; then
        echo "Build output (dist/) contents:"
        ls -la dist/
        
        # Create server public directory
        echo "=== Setting up Server Static Files ==="
        mkdir -p /var/app/current/admin/server/public
        
        # Copy built files to server
        cp -r dist/* /var/app/current/admin/server/public/
        
        echo "Files copied to server public directory:"
        ls -la /var/app/current/admin/server/public/
        
        echo "=== Frontend Build Process Completed Successfully ==="
    else
        echo "WARNING: Build completed but no dist/ directory found"
        echo "This might be normal for some build configurations"
    fi
else
    echo "ERROR: Frontend build failed"
    echo "Continuing deployment without frontend build..."
    # Don't exit with error - let the server run without frontend
fi

echo "=== Post-Deploy Hook Finished ==="
