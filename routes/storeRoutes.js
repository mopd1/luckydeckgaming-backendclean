// routes/storeRoutes.js

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { User, StoreTransaction, RevenueTransaction } = require('../models');
const sequelize = require('../config/database'); // Corrected Import

// Package purchase endpoint
router.post('/purchase-package', authenticateToken, async (req, res) => {
    let transaction;

    try {
        // Start a transaction
        transaction = await sequelize.transaction();

        const { chips, gems, price } = req.body;
        const userId = req.user.id;

        // Validate input
        if (chips === undefined || gems === undefined || price === undefined) {
            throw new Error('Invalid package data: chips, gems, and price are required.');
        }

        // Find and update user balance
        const user = await User.findByPk(userId, { transaction });
        if (!user) {
            throw new Error('User not found.');
        }

        // Update user's balances
        const newChipBalance = user.chips + chips;
        const newGemBalance = user.gems + gems;

        await user.update({
            chips: newChipBalance,
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
