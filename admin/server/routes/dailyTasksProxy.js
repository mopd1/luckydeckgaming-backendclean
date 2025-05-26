// dailyTasksProxy.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Configuration via environment variables (set in AWS EB Console)
const DAILY_TASKS_API_URL = process.env.DAILY_TASKS_API_URL || 'https://api.luckydeckgaming.com/api/daily-tasks';
const DAILY_TASKS_API_TOKEN = process.env.DAILY_TASKS_API_TOKEN;

// Validate required environment variables
if (!DAILY_TASKS_API_TOKEN) {
  console.error('FATAL: DAILY_TASKS_API_TOKEN environment variable is required');
  console.error('Please set this in your AWS Elastic Beanstalk environment configuration');
  process.exit(1);
}

// Log configuration (safely, without exposing token)
console.log('Daily Tasks Proxy Configuration:', {
  apiUrl: DAILY_TASKS_API_URL,
  tokenConfigured: !!DAILY_TASKS_API_TOKEN,
  tokenPrefix: DAILY_TASKS_API_TOKEN ? DAILY_TASKS_API_TOKEN.substring(0, 10) + '...' : 'MISSING'
});

// Request logging middleware
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Daily Tasks Proxy: ${req.method} ${req.url}`);
  next();
});

// Proxy middleware
router.all('*', async (req, res) => {
  try {
    const path = req.url;
    
    const headers = {
      'Authorization': `Bearer ${DAILY_TASKS_API_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    console.log(`Proxying ${req.method} to: ${DAILY_TASKS_API_URL}${path}`);
    
    const response = await axios({
      method: req.method,
      url: `${DAILY_TASKS_API_URL}${path}`,
      headers: headers,
      data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
      timeout: 30000,
      validateStatus: () => true
    });
    
    console.log(`Proxy response: ${response.status} ${response.statusText}`);
    
    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error('Daily Tasks Proxy Error:', {
      message: error.message,
      code: error.code,
      url: error.config?.url
    });
    
    if (error.code === 'ETIMEDOUT') {
      res.status(504).json({ 
        error: 'Gateway Timeout',
        message: 'Request to Daily Tasks API timed out'
      });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        error: 'Service Unavailable', 
        message: 'Cannot connect to Daily Tasks API server'
      });
    } else {
      res.status(500).json({ 
        error: 'Daily Tasks Proxy Error',
        message: 'An unexpected error occurred while proxying the request'
      });
    }
  }
});

module.exports = router;
