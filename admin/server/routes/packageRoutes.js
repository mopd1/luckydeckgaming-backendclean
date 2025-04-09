// admin/server/routes/packageRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/userAuth'); // Use userAuth middleware
const { Package } = require('../../../models'); // Import from main models
const { Op } = require('sequelize');

// Get all packages (for admin management)
router.get('/admin/all', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const packages = await Package.findAll({
      order: [['display_order', 'ASC']]
    });
    
    res.json({ packages });
  } catch (error) {
    console.error('Error fetching all packages:', error);
    res.status(500).json({ message: 'Error fetching packages', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Create new package (admin only)
router.post('/admin', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { active, price, chips, gems, display_order } = req.body;
    
    if (price === undefined || chips === undefined) {
      return res.status(400).json({ message: 'Price and chips are required' });
    }

    const newPackage = await Package.create({
      active: active !== undefined ? active : true,
      price,
      chips,
      gems: gems || 0,
      display_order: display_order || 0
    });
    
    res.status(201).json({ package: newPackage });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ message: 'Error creating package', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Update existing package (admin only)
router.put('/admin/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    const { active, price, chips, gems, display_order } = req.body;
    
    const packageToUpdate = await Package.findByPk(id);
    
    if (!packageToUpdate) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    // Update fields
    if (active !== undefined) packageToUpdate.active = active;
    if (price !== undefined) packageToUpdate.price = price;
    if (chips !== undefined) packageToUpdate.chips = chips;
    if (gems !== undefined) packageToUpdate.gems = gems;
    if (display_order !== undefined) packageToUpdate.display_order = display_order;
    
    await packageToUpdate.save();
    
    res.json({ package: packageToUpdate });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ message: 'Error updating package', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Delete package (admin only)
router.delete('/admin/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    const packageToDelete = await Package.findByPk(id);
    
    if (!packageToDelete) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    await packageToDelete.destroy();
    
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ message: 'Error deleting package', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

module.exports = router;
