const express = require('express');
const router = express.Router();
const { AvatarPart, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { cacheMiddleware, clearCache } = require('../middleware/cache');

// GET all avatar parts - cache for 1 hour
router.get('/', cacheMiddleware(3600), async (req, res) => {
  try {
    const avatarParts = await AvatarPart.findAll({
      include: [User]
    });
    res.json(avatarParts);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving avatar parts', error });
  }
});

// GET a single avatar part by ID - cache for 1 hour
router.get('/:id', cacheMiddleware(3600), async (req, res) => {
  try {
    const avatarPart = await AvatarPart.findByPk(req.params.id, {
      include: [User]
    });
    if (avatarPart) {
      res.json(avatarPart);
    } else {
      res.status(404).json({ message: 'Avatar part not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving avatar part', error });
  }
});

// POST a new avatar part - clear cache
router.post('/', authenticateToken, async (req, res) => {
  try {
    const newAvatarPart = await AvatarPart.create(req.body);
    
    // Clear related caches
    await clearCache('/');
    
    res.status(201).json(newAvatarPart);
  } catch (error) {
    res.status(400).json({ message: 'Error creating avatar part', error });
  }
});

// PUT (update) an avatar part - clear cache
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updatedAvatarPart = await AvatarPart.update(req.body, {
      where: { id: req.params.id }
    });
    
    if (updatedAvatarPart[0] === 1) {
      // Clear related caches
      await clearCache('/');
      await clearCache(`/${req.params.id}`);
      
      res.json({ message: 'Avatar part updated successfully' });
    } else {
      res.status(404).json({ message: 'Avatar part not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating avatar part', error });
  }
});

// DELETE an avatar part - clear cache
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deletedAvatarPart = await AvatarPart.destroy({
      where: { id: req.params.id }
    });
    
    if (deletedAvatarPart === 1) {
      // Clear related caches
      await clearCache('/');
      await clearCache(`/${req.params.id}`);
      
      res.json({ message: 'Avatar part deleted successfully' });
    } else {
      res.status(404).json({ message: 'Avatar part not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting avatar part', error });
  }
});

module.exports = router;
