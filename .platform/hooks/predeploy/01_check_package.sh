#!/bin/bash
echo "Checking package.json..."
cat /var/app/staging/package.json | grep -A 5 scripts
echo "Package.json check complete."
chmod +x .platform/hooks/predeploy/01_check_package.sh
