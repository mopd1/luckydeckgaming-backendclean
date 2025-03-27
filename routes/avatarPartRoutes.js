const express = require('express');
const router = express.Router();
const { AvatarPart, User } = require('../models');

// GET all avatar parts
router.get('/', async (req, res) => {
  try {
    const avatarParts = await AvatarPart.findAll({
      include: [User]
    });
    res.json(avatarParts);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving avatar parts', error });
  }
});

// GET a single avatar part by ID
router.get('/:id', async (req, res) => {
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

// POST a new avatar part
router.post('/', async (req, res) => {
  try {
    const newAvatarPart = await AvatarPart.create(req.body);
    res.status(201).json(newAvatarPart);
  } catch (error) {
    res.status(400).json({ message: 'Error creating avatar part', error });
  }
});

// PUT (update) an avatar part
router.put('/:id', async (req, res) => {
  try {
    const updatedAvatarPart = await AvatarPart.update(req.body, {
      where: { id: req.params.id }
    });
    if (updatedAvatarPart[0] === 1) {
      res.json({ message: 'Avatar part updated successfully' });
    } else {
      res.status(404).json({ message: 'Avatar part not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating avatar part', error });
  }
});

// DELETE an avatar part
router.delete('/:id', async (req, res) => {
  try {
    const deletedAvatarPart = await AvatarPart.destroy({
      where: { id: req.params.id }
    });
    if (deletedAvatarPart === 1) {
      res.json({ message: 'Avatar part deleted successfully' });
    } else {
      res.status(404).json({ message: 'Avatar part not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting avatar part', error });
  }
});

module.exports = router;
