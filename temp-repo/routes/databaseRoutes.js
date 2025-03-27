// admin/server/routes/databaseRoutes.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Get all tables
router.get('/tables', authenticateToken, requirePermission('view_database'), async (req, res) => {
  try {
    const [tables] = await sequelize.query('SHOW TABLES');
    const tableNames = tables.map(table => Object.values(table)[0]);
    
    res.json({ tables: tableNames });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get table structure
router.get('/tables/:tableName/structure', 
  authenticateToken, 
  requirePermission('view_database'), 
  async (req, res) => {
    try {
      const { tableName } = req.params;
      
      const [columns] = await sequelize.query(`DESCRIBE ${tableName}`);
      
      res.json({ columns });
    } catch (error) {
      console.error(`Error fetching structure for table ${req.params.tableName}:`, error);
      res.status(500).json({ message: 'Server error' });
    }
});

// Get table data with pagination
router.get('/tables/:tableName', 
  authenticateToken, 
  requirePermission('view_database'), 
  async (req, res) => {
    try {
      const { tableName } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      
      // Get total count
      const [countResult] = await sequelize.query(
        `SELECT COUNT(*) as total FROM ${tableName}`
      );
      const total = countResult[0].total;
      
      // Get data with pagination
      const [rows] = await sequelize.query(
        `SELECT * FROM ${tableName} LIMIT ${limit} OFFSET ${offset}`
      );
      
      res.json({
        data: rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error(`Error fetching data for table ${req.params.tableName}:`, error);
      res.status(500).json({ message: 'Server error' });
    }
});

// Execute custom SQL query
router.post('/query', 
  authenticateToken, 
  requirePermission('execute_sql'), 
  async (req, res) => {
    try {
      const { sql } = req.body;
      
      if (!sql) {
        return res.status(400).json({ message: 'SQL query is required' });
      }
      
      // Check if query is a SELECT
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      
      // Execute query
      const result = await sequelize.query(sql, {
        type: isSelect ? sequelize.QueryTypes.SELECT : sequelize.QueryTypes.RAW
      });
      
      res.json({ result });
    } catch (error) {
      console.error('Error executing SQL query:', error);
      res.status(500).json({ 
        message: 'Error executing SQL query',
        error: error.message 
      });
    }
});

module.exports = router;
