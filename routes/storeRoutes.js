// routes/storeRoutes.js

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { User, StoreTransaction, RevenueTransaction } = require('../models');
const { sequelize } = require('../models');
const { Package } = require('../models');
const { cacheMiddleware, clearCache } = require('../middleware/cache');

// Get all packages - cache for 30 minutes
router.get('/packages', cacheMiddleware(1800), async (req, res) => {
  try {
    const packages = await Package.findAll({
      where: { active: true },
      order: [['price', 'ASC']]
    });
    
    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Package purchase endpoint - clear balance cache
router.post('/purchase-package', authenticateToken, async (req, res) => {
    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        const { package_id } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!package_id) {
            throw new Error('Package ID is required.');
        }

        // Find the package
        const packageItem = await Package.findByPk(package_id, { transaction });
        if (!packageItem || !packageItem.active) {
            throw new Error('Package not found or not active.');
        }

        const chips = packageItem.chips;
        const gems = packageItem.gems;
        const price = packageItem.price;

        // Find and update user balance
        const user = await User.findByPk(userId, { transaction });
        if (!user) {
            throw new Error('User not found.');
        }

        // Update user's balances - FIXED TO USE CORRECT FIELD NAMES
        const newChipBalance = user.balance + chips; // Changed from user.chips to user.balance
        const newGemBalance = user.gems + gems;

        await user.update({
            balance: newChipBalance, // Changed from chips: newChipBalance to balance: newChipBalance
            gems: newGemBalance
        }, { transaction });

        // Create store transaction record
        const storeTransaction = await StoreTransaction.create({
            user_id: userId,
            chips_added: chips,
            gems_added: gems,
            type: 'package_purchase',
            price: price,
            timestamp: new Date()
        }, { transaction });

        // Create revenue transaction record
        const revenueTransaction = await RevenueTransaction.create({
            user_id: userId,
            amount: price,
            type: 'package_purchase',
            timestamp: new Date()
        }, { transaction });

        // Update store transaction with revenue transaction ID
        await storeTransaction.update({
            transaction_id: revenueTransaction.id
        }, { transaction });

        // Commit transaction
        await transaction.commit();

        // Clear balance cache
        await clearCache('/balance');
        await clearCache('/packages');

        // Send response with updated balances
        res.json({
            success: true,
            new_balance: newChipBalance,
            new_gems: newGemBalance,
            message: 'Package purchased successfully'
        });

    } catch (error) {
        // Rollback transaction on error
        if (transaction) await transaction.rollback();

        console.error('Package purchase error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to process package purchase'
        });
    }
});
// Package purchase endpoint - accepts package ID in URL
router.post('/purchase-package/:id', authenticateToken, async (req, res) => {
    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        const package_id = req.params.id; // Get from URL parameter
        const userId = req.user.id;

        // Validate input
        if (!package_id) {
            throw new Error('Package ID is required.');
        }

        // Find the package
        const packageItem = await Package.findByPk(package_id, { transaction });
        if (!packageItem || !packageItem.active) {
            throw new Error('Package not found or not active.');
        }

        const chips = packageItem.chips;
        const gems = packageItem.gems;
        const price = packageItem.price;

        // Find and update user balance
        const user = await User.findByPk(userId, { transaction });
        if (!user) {
            throw new Error('User not found.');
        }

        // Update user's balances
        const newChipBalance = user.balance + chips;
        const newGemBalance = user.gems + gems;

        await user.update({
            balance: newChipBalance,
            gems: newGemBalance
        }, { transaction });

        // Create store transaction record
        const storeTransaction = await StoreTransaction.create({
            user_id: userId,
            chips_added: chips,
            gems_added: gems,
            type: 'package_purchase',
            price: price,
            timestamp: new Date()
        }, { transaction });

        // Create revenue transaction record
        const revenueTransaction = await RevenueTransaction.create({
            user_id: userId,
            amount: price,
            type: 'package_purchase',
            timestamp: new Date()
        }, { transaction });

        // Update store transaction with revenue transaction ID
        await storeTransaction.update({
            transaction_id: revenueTransaction.id
        }, { transaction });

        // Commit transaction
        await transaction.commit();

        // Clear balance cache
        await clearCache('/balance');
        await clearCache('/packages');

        // Send response with updated balances
        res.json({
            success: true,
            new_balance: newChipBalance,
            new_gems: newGemBalance,
            message: 'Package purchased successfully'
        });

    } catch (error) {
        // Rollback transaction on error
        if (transaction) await transaction.rollback();

        console.error('Package purchase error:', error.message);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to process package purchase'
        });
    }
});

module.exports = router;
