const express = require('express');
const router = express.Router();
const { StoreTransaction, User, AvatarPart } = require('../models');

// GET all store transactions
router.get('/', async (req, res) => {
  try {
    const storeTransactions = await StoreTransaction.findAll({
      include: [User, AvatarPart]
    });
    res.json(storeTransactions);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving store transactions', error });
  }
});

// GET a single store transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const storeTransaction = await StoreTransaction.findByPk(req.params.id, {
      include: [User, AvatarPart]
    });
    if (storeTransaction) {
      res.json(storeTransaction);
    } else {
      res.status(404).json({ message: 'Store transaction not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving store transaction', error });
  }
});

// POST a new store transaction
router.post('/', async (req, res) => {
  try {
    const newStoreTransaction = await StoreTransaction.create(req.body);
    res.status(201).json(newStoreTransaction);
  } catch (error) {
    res.status(400).json({ message: 'Error creating store transaction', error });
  }
});

// PUT (update) a store transaction
router.put('/:id', async (req, res) => {
  try {
    const updatedStoreTransaction = await StoreTransaction.update(req.body, {
      where: { id: req.params.id }
    });
    if (updatedStoreTransaction[0] === 1) {
      res.json({ message: 'Store transaction updated successfully' });
    } else {
      res.status(404).json({ message: 'Store transaction not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Error updating store transaction', error });
  }
});

// DELETE a store transaction
router.delete('/:id', async (req, res) => {
  try {
    const deletedStoreTransaction = await StoreTransaction.destroy({
      where: { id: req.params.id }
    });
    if (deletedStoreTransaction === 1) {
      res.json({ message: 'Store transaction deleted successfully' });
    } else {
      res.status(404).json({ message: 'Store transaction not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error deleting store transaction', error });
  }
});

module.exports = router;
