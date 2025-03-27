const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// PUT update user settings - IMPORTANT: This specific route must come BEFORE any routes with path parameters like /:id
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    console.log("Settings route hit with user ID:", req.user.id);
    console.log("Request body:", req.body);

    const { language } = req.body;
    
    // Validate language code if provided
    if (language) {
      // Optional: Add validation for supported language codes
      const validLanguages = ['en', 'pt_BR', 'es', 'id', 'ms', 'fr', 'de', 'th', 'zh_CN', 'zh_TW', 'vi', 'tr'];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({ message: 'Invalid language code' });
      }
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      console.log("User not found with ID:", req.user.id);
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user settings
    if (language) {
      console.log("Updating language from", user.language_preference, "to", language);
      user.language_preference = language;
    }

    // Add any other settings here as needed
    await user.save();
    console.log("Settings saved successfully");

    // Return updated settings
    res.json({
      message: 'Settings updated successfully',
      settings: {
        language: user.language_preference
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating user settings' });
  }
});

// GET all users
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving users', error });
  }
});

// GET a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user', error });
  }
});

// POST a new user
router.post('/', async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: 'Error creating user', error });
  }
});

// PUT (update) a user
router.put('/:id', async (req, res) => {
  try {
    const updatedUser = await User.update(req.body, {
      where: { id: req.params.id }
    });
    if (updatedUser[0] === 1) {
      res.json({ message: 'User updated successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating user', error });
  }
});

// PUT update user's chip balance
router.put('/update-chips', authenticateToken, async (req, res) => {
  try {
    const { chips } = req.body;

    // Validate chips value
    if (typeof chips !== 'number' || chips < 0) {
      return res.status(400).json({ message: 'Invalid chips value' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update balance
    user.balance = chips;
    await user.save();

    // Return updated user data
    res.json({
      message: 'Balance updated successfully',
      new_balance: user.balance
    });
  } catch (error) {
    console.error('Error updating chips:', error);
    res.status(500).json({ message: 'Error updating chips balance' });
  }
});

// DELETE a user
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.destroy({
      where: { id: req.params.id }
    });
    if (deletedUser === 1) {
      res.json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error });
  }
});

module.exports = router;
