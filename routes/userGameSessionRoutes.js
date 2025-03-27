const express = require('express');
const router = express.Router();
const { UserGameSession, User, GameSession } = require('../models');

// GET all user game sessions
router.get('/', async (req, res) => {
  try {
    const userGameSessions = await UserGameSession.findAll({
      include: [User, GameSession]
    });
    res.json(userGameSessions);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user game sessions', error });
  }
});

// GET a single user game session by ID
router.get('/:id', async (req, res) => {
  try {
    const userGameSession = await UserGameSession.findByPk(req.params.id, {
      include: [User, GameSession]
    });
    if (userGameSession) {
      res.json(userGameSession);
    } else {
      res.status(404).json({ message: 'User game session not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user game session', error });
  }
});

// POST a new user game session
router.post('/', async (req, res) => {
  try {
    const newUserGameSession = await UserGameSession.create(req.body);
    res.status(201).json(newUserGameSession);
  } catch (error) {
    res.status(400).json({ message: 'Error creating user game session', error });
  }
});

// PUT (update) a user game session
router.put('/:id', async (req, res) => {
  try {
    const updatedUserGameSession = await UserGameSession.update(req.body, {
      where: { id: req.params.id }
    });
    if (updatedUserGameSession[0] === 1) {
      res.json({ message: 'User game session updated successfully' });
    } else {
      res.status(404).json({ message: 'User game session not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating user game session', error });
  }
});

// DELETE a user game session
router.delete('/:id', async (req, res) => {
  try {
    const deletedUserGameSession = await UserGameSession.destroy({
      where: { id: req.params.id }
    });
    if (deletedUserGameSession === 1) {
      res.json({ message: 'User game session deleted successfully' });
    } else {
      res.status(404).json({ message: 'User game session not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user game session', error });
  }
});

module.exports = router;
