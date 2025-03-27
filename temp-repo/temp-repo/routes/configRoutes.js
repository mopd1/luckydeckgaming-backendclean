// admin/server/routes/configRoutes.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// Get all configuration values
router.get('/', authenticateToken, requirePermission('view_config'), async (req, res) => {
  try {
    // Check if table exists
    const [tables] = await sequelize.query("SHOW TABLES LIKE 'game_config'");
    
    if (tables.length === 0) {
      // Create table if it doesn't exist
      await sequelize.query(`
        CREATE TABLE game_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          key_name VARCHAR(100) NOT NULL UNIQUE,
          value TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      // Insert default values
      await sequelize.query(`
        INSERT INTO game_config (key_name, value, description) VALUES
        ('initial_chips', '1000000', 'Initial chips given to new users'),
        ('free_chip_amount', '100000', 'Free chips given every 4 hours'),
        ('free_chip_cooldown', '14400', 'Cooldown time in seconds (4 hours)')
      `);
    }
    
    // Get all config values
    const [configs] = await sequelize.query('SELECT * FROM game_config');
    
    res.json({ config: configs });
  } catch (error) {
    console.error('Error fetching configuration:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update or create configuration value
router.put('/:keyName', 
  authenticateToken, 
  requirePermission('manage_config'), 
  async (req, res) => {
    try {
      const { keyName } = req.params;
      const { value, description } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ message: 'Value is required' });
      }
      
      // Check if key exists
      const [existingKey] = await sequelize.query(
        'SELECT * FROM game_config WHERE key_name = ?',
        {
          replacements: [keyName],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (existingKey) {
        // Update existing key
        await sequelize.query(
          'UPDATE game_config SET value = ?, description = ? WHERE key_name = ?',
          {
            replacements: [
              value, 
              description || existingKey.description, 
              keyName
            ]
          }
        );
      } else {
        // Create new key
        await sequelize.query(
          'INSERT INTO game_config (key_name, value, description) VALUES (?, ?, ?)',
          {
            replacements: [keyName, value, description || '']
          }
        );
      }
      
      res.json({
        key_name: keyName,
        value,
        description: description || (existingKey ? existingKey.description : '')
      });
    } catch (error) {
      console.error(`Error updating configuration key ${req.params.keyName}:`, error);
      res.status(500).json({ message: 'Server error' });
    }
});

// Delete configuration key
router.delete('/:keyName', 
  authenticateToken, 
  requirePermission('manage_config'), 
  async (req, res) => {
    try {
      const { keyName } = req.params;
      
      // Delete key
      await sequelize.query(
        'DELETE FROM game_config WHERE key_name = ?',
        {
          replacements: [keyName]
        }
      );
      
      res.json({
        success: true,
        key_name: keyName
      });
    } catch (error) {
      console.error(`Error deleting configuration key ${req.params.keyName}:`, error);
      res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
