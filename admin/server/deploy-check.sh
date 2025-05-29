#!/bin/bash
# Deployment verification script for admin server

echo "=== Admin Server Deployment Check ==="
echo "Date: $(date)"
echo "Repository: luckydeckgaming-backendclean"
echo "Branch: main"
echo ""

echo "✅ Key files that should exist:"
echo "   - admin/server/server.js (updated to use dailyTasksRoutes)"
echo "   - admin/server/routes/dailyTasksRoutes.js (with all endpoints)"
echo "   - admin/server/models/ (all models including DailyTask, TaskAction, etc.)"
echo ""

echo "🚀 To deploy to Elastic Beanstalk:"
echo "   1. Make sure your EB CLI is configured"
echo "   2. From admin/server/ directory, run: eb deploy"
echo "   3. Or deploy from GitHub if you have GitHub integration enabled"
echo ""

echo "🔍 If deployment fails, check:"
echo "   - EB environment variables are set correctly"
echo "   - Database credentials are configured"
echo "   - All npm dependencies are in package.json"
echo ""

echo "📝 The server.js now correctly requires: './routes/dailyTasksRoutes'"
echo "📝 The dailyTasksRoutes provides endpoints:"
echo "   - GET /api/daily-tasks/actions (for dropdown)"
echo "   - GET /api/daily-tasks/tasks (task list)"
echo "   - POST /api/daily-tasks/tasks (create task)"
echo "   - PUT /api/daily-tasks/tasks/:taskId (update task)"
echo "   - DELETE /api/daily-tasks/tasks/:taskId (delete task)"
echo "   - GET /api/daily-tasks/sets (task sets)"
