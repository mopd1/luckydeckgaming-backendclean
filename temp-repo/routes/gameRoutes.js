const express = require('express');
const router = express.Router();
const { Game } = require('../models');

// GET all games
router.get('/', async (req, res) => {
  try {
    const games = await Game.findAll();
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving games', error });
  }
});

// GET a single game by ID
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findByPk(req.params.id);
    if (game) {
      res.json(game);
    } else {
      res.status(404).json({ message: 'Game not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving game', error });
  }
});

// POST a new game
router.post('/', async (req, res) => {
  try {
    const newGame = await Game.create(req.body);
    res.status(201).json(newGame);
  } catch (error) {
    res.status(400).json({ message: 'Error creating game', error });
  }
});

// PUT (update) a game
router.put('/:id', async (req, res) => {
  try {
    const updatedGame = await Game.update(req.body, {
      where: { id: req.params.id }
    });
    if (updatedGame[0] === 1) {
      res.json({ message: 'Game updated successfully' });
    } else {
      res.status(404).json({ message: 'Game not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating game', error });
  }
});

// DELETE a game
router.delete('/:id', async (req, res) => {
  try {
    const deletedGame = await Game.destroy({
      where: { id: req.params.id }
    });
    if (deletedGame === 1) {
      res.json({ message: 'Game deleted successfully' });
    } else {
      res.status(404).json({ message: 'Game not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting game', error });
  }
});

module.exports = router;
