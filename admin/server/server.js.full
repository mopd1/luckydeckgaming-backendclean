// admin/server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const economyRoutes = require('./routes/economyRoutes');
const dailyTasksProxy = require('./routes/dailyTasksProxy');
const seasonPassAdminRoutes = require('./routes/seasonPassAdminRoutes');
const packageRoutes = require('./routes/packageRoutes');
const crmRoutes = require('./routes/crmRoutes');

// Create Express app
const app = express();
const port = process.env.ADMIN_PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['https://admin.luckydeckgaming.com', 'http://localhost:5173'],
  credentials: true
}));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Request body:', req.body);
  next();
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Serve static files from frontend build (if exists)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/daily-tasks', dailyTasksProxy);
app.use('/api/admin/season-pass', seasonPassAdminRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/crm', crmRoutes);

// Placeholder for other routes that haven't been implemented yet
app.use('/api/database', (req, res) => {
  res.json({ message: "Database API not implemented yet" });
});

app.use('/api/config', (req, res) => {
  res.json({ message: "Config API not implemented yet" });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Add this route for health checks when accessing /api/
app.get('/api/', (req, res) => {
  res.json({ 
    message: 'Lucky Deck Gaming Admin Server',
    status: 'running',
    port: port,
    timestamp: new Date().toISOString()
  });
});

// Also add a /health route at root level
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'admin-server',
    port: port,
    timestamp: new Date().toISOString()
  });
});

// SPA fallback - serve index.html for any non-API routes
app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api/')) {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    // Check if built frontend exists
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback if frontend not built
      res.json({
        message: 'Admin Frontend Not Built',
        instructions: 'Frontend needs to be built. Building on server...',
        api_status: 'running',
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Admin API Error]', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Admin server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
