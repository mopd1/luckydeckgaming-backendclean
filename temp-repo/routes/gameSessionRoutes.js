const express = require('express');
const router = express.Router();
const { GameSession, Game, User } = require('../models');

// GET all game sessions
router.get('/', async (req, res) => {
  try {
    const gameSessions = await GameSession.findAll({
      include: [Game, User]
    });
    res.json(gameSessions);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving game sessions', error });
  }
});

// GET a single game session by ID
router.get('/:id', async (req, res) => {
  try {
    const gameSession = await GameSession.findByPk(req.params.id, {
      include: [Game, User]
    });
    if (gameSession) {
      res.json(gameSession);
    } else {
      res.status(404).json({ message: 'Game session not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving game session', error });
  }
});

// POST a new game session
router.post('/', async (req, res) => {
  try {
    const newGameSession = await GameSession.create(req.body);
    res.status(201).json(newGameSession);
  } catch (error) {
    res.status(400).json({ message: 'Error creating game session', error });
  }
});

// PUT (update) a game session
router.put('/:id', async (req, res) => {
  try {
    const updatedGameSession = await GameSession.update(req.body, {
      where: { id: req.params.id }
    });
    if (updatedGameSession[0] === 1) {
      res.json({ message: 'Game session updated successfully' });
    } else {
      res.status(404).json({ message: 'Game session not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating game session', error });
  }
});

// DELETE a game session
router.delete('/:id', async (req, res) => {
  try {
    const deletedGameSession = await GameSession.destroy({
      where: { id: req.params.id }
    });
    if (deletedGameSession === 1) {
      res.json({ message: 'Game session deleted successfully' });
    } else {
      res.status(404).json({ message: 'Game session not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting game session', error });
  }
});

module.exports = router;
