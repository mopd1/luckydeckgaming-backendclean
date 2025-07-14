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

const https = require('https');

// Apple receipt validation endpoint
router.post('/validate-apple-receipt', authenticateToken, async (req, res) => {
    let transaction;
    
    try {
        transaction = await sequelize.transaction();
        
        const { receiptData, productId, transactionId, packageId, environment } = req.body;
        const userId = req.user.id;
        
        console.log('Validating Apple receipt for user:', userId, 'product:', productId, 'package:', packageId);
        
        // Validate receipt with Apple
        const appleValidation = await validateAppleReceipt(receiptData);
        
        if (!appleValidation.valid) {
            throw new Error('Invalid Apple receipt: ' + appleValidation.error);
        }
        
        // Check if this transaction was already processed
        const existingTransaction = await StoreTransaction.findOne({
            where: { apple_transaction_id: transactionId },
            transaction
        });
        
        if (existingTransaction) {
            throw new Error('Transaction already processed');
        }
        
        // Get package info from database using packageId
        const packageItem = await Package.findByPk(packageId, { transaction });
        if (!packageItem || !packageItem.active) {
            throw new Error('Package not found or not active');
        }
        
        // Find and update user balance
        const user = await User.findByPk(userId, { transaction });
        if (!user) {
            throw new Error('User not found');
        }
        
        const newChipBalance = user.balance + packageItem.chips;
        const newGemBalance = user.gems + packageItem.gems;
        
        await user.update({
            balance: newChipBalance,
            gems: newGemBalance
        }, { transaction });
        
        // Create store transaction record
        const storeTransaction = await StoreTransaction.create({
            user_id: userId,
            chips_added: packageItem.chips,
            gems_added: packageItem.gems,
            type: 'apple_iap',
            price: packageItem.price,
            apple_product_id: productId,
            apple_transaction_id: transactionId,
            timestamp: new Date()
        }, { transaction });
        
        // Create revenue transaction record
        const revenueTransaction = await RevenueTransaction.create({
            user_id: userId,
            amount: packageItem.price,
            type: 'apple_iap',
            timestamp: new Date()
        }, { transaction });
        
        await transaction.commit();
        
        // Clear cache
        await clearCache('/balance');
        
        console.log('Apple purchase validated successfully for user:', userId);
        
        res.json({
            success: true,
            packageId: packageId,
            chipsAmount: packageItem.chips,
            newBalance: newChipBalance,
            new_gems: newGemBalance,
            message: 'Purchase validated and processed successfully'
        });
        
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Apple receipt validation error:', error.message);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to validate Apple receipt'
        });
    }
});
      

function validateAppleReceipt(receiptData) {
    return new Promise((resolve, reject) => {
        // Use sandbox URL for testing, production URL for live app
        const isProduction = process.env.NODE_ENV === 'production';
        const hostname = isProduction ? 'buy.itunes.apple.com' : 'sandbox.itunes.apple.com';
        
        const postData = JSON.stringify({
            'receipt-data': receiptData,
            'password': process.env.APPLE_SHARED_SECRET
        });
        
        const options = {
            hostname: hostname,
            port: 443,
            path: '/verifyReceipt',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        console.log('Validating receipt with Apple:', hostname);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('Apple validation response status:', response.status);
                    
                    if (response.status === 0) {
                        // Extract transaction info from the receipt
                        const receipt = response.receipt;
                        const inApp = receipt.in_app[receipt.in_app.length - 1]; // Get latest transaction
                        
                        resolve({
                            valid: true,
                            transaction_id: inApp.transaction_id,
                            product_id: inApp.product_id,
                            purchase_date: inApp.purchase_date_ms
                        });
                    } else {
                        resolve({ 
                            valid: false, 
                            error: 'Apple receipt validation failed with status: ' + response.status 
                        });
                    }
                } catch (parseError) {
                    resolve({ valid: false, error: 'Failed to parse Apple response: ' + parseError.message });
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('Apple validation error:', error);
            resolve({ valid: false, error: error.message });
        });
        
        req.write(postData);
        req.end();
    });
}

function getPackageFromAppleProductId(productId) {
    const productMap = {
        'com.luckydeckgaming.chips_1999': { chips: 2000, gems: 0, price: 1.99 },
        'com.luckydeckgaming.chips_4999': { chips: 7500, gems: 100, price: 4.99 },
        'com.luckydeckgaming.chips_9999': { chips: 20000, gems: 200, price: 9.99 },
        'com.luckydeckgaming.chips_19999': { chips: 50000, gems: 400, price: 19.99 },
        'com.luckydeckgaming.chips_49999': { chips: 150000, gems: 1000, price: 49.99 },
        'com.luckydeckgaming.chips_99999': { chips: 400000, gems: 2000, price: 99.99 }
    };
    
    return productMap[productId] || null;
} 

module.exports = router;
