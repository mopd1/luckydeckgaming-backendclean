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
const port = process.env.ADMIN_PORT || 3002;

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/daily-tasks', dailyTasksProxy);
app.use('/api/admin/season-pass', seasonPassAdminRoutes);
app.use('/api/packages', packageRoutes);
app.use('/crm', crmRoutes);

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Admin API Error]', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(port, () => {
  console.log(`Admin server running on port ${port}`);
});
