#!/bin/bash
cd /var/app/staging
echo "Installing all necessary dependencies..."
npm install passport-jwt passport-google-oauth20 ioredis
npm install
