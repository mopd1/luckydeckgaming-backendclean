// dailyTasksProxy.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// The base URL of your main server
const MAIN_API_URL = 'http://localhost:3000/api/daily-tasks';

// Your main server's admin token
const MAIN_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbi1wcm94eSIsImlzX2FkbWluIjp0cnVlLCJpYXQiOjE3NDI4NDk4MTgsImV4cCI6MTc3NDQwNzQxOH0.ZXlVG-1q4HFpXEY0A35MmefVCeuSWbrSMVFfveZSjoc';

// Log all requests
router.use((req, res, next) => {
  console.log(`Daily Tasks Proxy: ${req.method} ${req.url}`);
  next();
});

// Proxy middleware - forwards all requests to the main server with admin token
router.all('*', async (req, res) => {
  try {
    // Get the path after /daily-tasks
    const path = req.url;
    
    // Create headers with admin token for the main server
    const headers = {
      'Authorization': `Bearer ${MAIN_API_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    console.log(`Proxying ${req.method} request to ${MAIN_API_URL}${path}`);
    
    // Forward the request with the admin token
    const response = await axios({
      method: req.method,
      url: `${MAIN_API_URL}${path}`,
      headers: headers,
      data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined
    });
    
    console.log(`Proxy response status: ${response.status}`);
    
    // Send the response back to the client
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Forward error response if available
    if (error.response) {
      console.error('Error details:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to proxy request',
        message: error.message
      });
    }
  }
});

module.exports = router;
