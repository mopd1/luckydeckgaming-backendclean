const express = require('express');
const router = express.Router();
const { RevenueTransaction, User } = require('../models');

// GET all revenue transactions
router.get('/', async (req, res) => {
  try {
    const revenueTransactions = await RevenueTransaction.findAll({
      include: [User]
    });
    res.json(revenueTransactions);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving revenue transactions', error });
  }
});

// GET a single revenue transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const revenueTransaction = await RevenueTransaction.findByPk(req.params.id, {
      include: [User]
    });
    if (revenueTransaction) {
      res.json(revenueTransaction);
    } else {
      res.status(404).json({ message: 'Revenue transaction not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving revenue transaction', error });
  }
});

// POST a new revenue transaction
router.post('/', async (req, res) => {
  try {
    const newRevenueTransaction = await RevenueTransaction.create(req.body);
    res.status(201).json(newRevenueTransaction);
  } catch (error) {
    res.status(400).json({ message: 'Error creating revenue transaction', error });
  }
});

// PUT (update) a revenue transaction
router.put('/:id', async (req, res) => {
  try {
    const updatedRevenueTransaction = await RevenueTransaction.update(req.body, {
      where: { id: req.params.id }
    });
    if (updatedRevenueTransaction[0] === 1) {
      res.json({ message: 'Revenue transaction updated successfully' });
    } else {
      res.status(404).json({ message: 'Revenue transaction not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating revenue transaction', error });
  }
});

// DELETE a revenue transaction
router.delete('/:id', async (req, res) => {
  try {
    const deletedRevenueTransaction = await RevenueTransaction.destroy({
      where: { id: req.params.id }
    });
    if (deletedRevenueTransaction === 1) {
      res.json({ message: 'Revenue transaction deleted successfully' });
    } else {
      res.status(404).json({ message: 'Revenue transaction not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting revenue transaction', error });
  }
});

module.exports = router;
