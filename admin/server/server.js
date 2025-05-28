// admin/server/server.js - MINIMAL WORKING VERSION
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

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

// Serve static files from frontend build (if exists)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Basic health routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'admin-server',
    port: port,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'admin-server',
    port: port,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/', (req, res) => {
  res.json({ 
    message: 'Lucky Deck Gaming Admin Server',
    status: 'running',
    port: port,
    timestamp: new Date().toISOString()
  });
});

// Placeholder routes for now
app.use('/api/auth', (req, res) => {
  res.json({ message: "Auth API - coming soon", timestamp: new Date().toISOString() });
});

app.use('/api/dashboard', (req, res) => {
  res.json({ message: "Dashboard API - coming soon", timestamp: new Date().toISOString() });
});

app.use('/api/users', (req, res) => {
  res.json({ message: "Users API - coming soon", timestamp: new Date().toISOString() });
});

app.use('/api/economy', (req, res) => {
  res.json({ message: "Economy API - coming soon", timestamp: new Date().toISOString() });
});

app.use('/api/daily-tasks', (req, res) => {
  res.json({ message: "Daily Tasks API - coming soon", timestamp: new Date().toISOString() });
});

app.use('/api/admin/season-pass', (req, res) => {
  res.json({ message: "Season Pass Admin API - coming soon", timestamp: new Date().toISOString() });
});

app.use('/api/packages', (req, res) => {
  res.json({ message: "Packages API - coming soon", timestamp: new Date().toISOString() });
});

app.use('/api/crm', (req, res) => {
  res.json({ message: "CRM API - coming soon", timestamp: new Date().toISOString() });
});

app.use('/api/database', (req, res) => {
  res.json({ message: "Database API - coming soon", timestamp: new Date().toISOString() });
});

app.use('/api/config', (req, res) => {
  res.json({ message: "Config API - coming soon", timestamp: new Date().toISOString() });
});

// SPA fallback - serve index.html for any non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.json({
        message: 'Lucky Deck Gaming Admin Interface',
        description: 'Frontend will be built in next deployment',
        api_status: 'running',
        available_endpoints: [
          '/api/health',
          '/api/',
          '/api/auth',
          '/api/dashboard',
          '/api/users',
          '/api/economy',
          '/api/daily-tasks',
          '/api/admin/season-pass',
          '/api/packages',
          '/api/crm',
          '/api/database',
          '/api/config'
        ],
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
  console.log('Server started successfully - no database dependencies');
});
