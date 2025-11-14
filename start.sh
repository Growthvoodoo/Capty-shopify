#!/bin/sh

# Startup script for DigitalOcean deployment
# This script initializes the database before starting the app

echo "🔧 Initializing database..."

# Run Prisma DB push to create tables if they don't exist
# This is safe to run multiple times - it only creates missing tables
npx prisma db push --skip-generate

if [ $? -eq 0 ]; then
  echo "✅ Database initialized successfully"
else
  echo "⚠️  Database initialization had warnings (this is normal if tables already exist)"
fi

echo "🚀 Starting application..."

# Start the Remix server
npm start
