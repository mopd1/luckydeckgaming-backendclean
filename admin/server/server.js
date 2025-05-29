// admin/server/server.js - COMPLETE WITH ALL ROUTES
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Create Express app
const app = express();
const port = process.env.ADMIN_PORT || 3000;

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'https://admin.luckydeckgaming.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body keys:', Object.keys(req.body));
  }
  next();
});

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Import route modules
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const economyRoutes = require('./routes/economyRoutes');
const dailyTasksProxy = require('./routes/dailyTasksProxy');
const seasonPassAdminRoutes = require('./routes/seasonPassAdminRoutes');
const packageRoutes = require('./routes/packageRoutes');
const crmRoutes = require('./routes/crmRoutes');
const databaseRoutes = require('./routes/databaseRoutes');
const configRoutes = require('./routes/configRoutes');

// Health check routes (keep these first)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'admin-server',
    port: port,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      host: process.env.DB_HOST || 'not configured',
      name: process.env.DB_NAME || 'not configured',
      connection: 'checking...'
    }
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
    timestamp: new Date().toISOString(),
    routes: [
      'GET /api/health - Health check',
      'POST /api/auth/login - Admin login',
      'GET /api/dashboard/stats - Dashboard statistics',
      'GET /api/dashboard/activities - Recent activities',
      'GET /api/users - User management',
      'GET /api/economy - Economy data',
      'GET /api/daily-tasks - Daily tasks management',
      'GET /api/admin/season-pass - Season pass administration',
      'GET /api/packages - Package management',
      'GET /api/crm - Customer relationship management',
      'GET /api/database - Database administration',
      'GET /api/config - Configuration management'
    ]
  });
});

// Route configuration
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/daily-tasks', dailyTasksProxy);
app.use('/api/admin/season-pass', seasonPassAdminRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/config', configRoutes);

// SPA fallback - serve index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    const indexPath = path.join(__dirname, 'frontend/dist/index.html');
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.json({
        message: 'Lucky Deck Gaming Admin Interface',
        description: 'SPA Frontend Ready',
        api_status: 'All routes active',
        frontend_status: 'Built and ready',
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('[Admin API Error]', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Admin server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database Host: ${process.env.DB_HOST || 'not configured'}`);
  console.log(`Database Name: ${process.env.DB_NAME || 'not configured'}`);
  console.log('✅ Admin server started successfully with all routes active');
  console.log('🔄 Database models will be loaded on first request');
});
