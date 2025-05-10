const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const sequelize = require('../config/database');
const { StoreTransaction } = require('../models');
const { cacheMiddleware, clearCache } = require('../middleware/cache');

// Update user's balance
router.put('/update-chips', authenticateToken, async (req, res) => {
  console.log('Balance update request received:', {
    userId: req?.user?.id,
    body: req.body,
    headers: req.headers,
    path: req.path,
    timestamp: new Date().toISOString()
  });

  try {
    // Expect "balance" in the request body
    const { balance } = req.body;

    if (balance === undefined) {
      console.log('Balance update failed: Balance field missing in request', {
        userId: req?.user?.id,
        body: req.body
      });
      return res.status(400).json({ message: 'Balance field is required' });
    }

    if (typeof balance !== 'number' || balance < 0) {
      console.log('Balance update failed: Invalid balance value', {
        userId: req?.user?.id,
        invalidBalance: balance,
        type: typeof balance
      });
      return res.status(400).json({ message: 'Invalid balance value' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      console.log('Balance update failed: User not found', {
        userId: req.user.id,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Updating balance for user:', {
      userId: user.id,
      oldBalance: user.balance,
      newBalance: balance,
      timestamp: new Date().toISOString()
    });

    // Store old balance for logging
    const oldBalance = user.balance;

    // Update balance
    user.balance = balance;
    await user.save();

    // Clear balance cache
    await clearCache('/balance');

    console.log('Balance updated successfully:', {
      userId: user.id,
      oldBalance: oldBalance,
      newBalance: user.balance,
      difference: user.balance - oldBalance,
      timestamp: new Date().toISOString()
    });

    // Return updated user data
    res.json({
      success: true,
      new_balance: user.balance,
      old_balance: oldBalance,
      difference: user.balance - oldBalance,
      message: 'Balance updated successfully'
    });

  } catch (error) {
    console.error('Error updating balance:', {
      error: error.message,
      stack: error.stack,
      userId: req?.user?.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: 'Error updating balance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's current balance - cached for 30 seconds
router.get('/balance', authenticateToken, cacheMiddleware(30), async (req, res) => {
  console.log('Balance request received:', {
    userId: req?.user?.id,
    timestamp: new Date().toISOString()
  });

  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['balance']
    });

    if (!user) {
      console.log('Balance request failed: User not found', {
        userId: req.user.id,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Balance request successful:', {
      userId: req.user.id,
      balance: user.balance,
      timestamp: new Date().toISOString()
    });

    res.json({ balance: user.balance });
  } catch (error) {
    console.error('Error fetching balance:', {
      error: error.message,
      stack: error.stack,
      userId: req?.user?.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: 'Error fetching balance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add chips incrementally
router.post('/add-chips', authenticateToken, async (req, res) => {
  console.log('Add chips request received:', {
    userId: req?.user?.id,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { amount, source = 'general' } = req.body;
    
    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      console.log('Add chips failed: Invalid amount', {
        userId: req?.user?.id,
        amount,
        type: typeof amount
      });
      return res.status(400).json({ message: 'Invalid amount value' });
    }
    
    // Use transaction for data integrity
    const transaction = await sequelize.transaction();
    
    try {
      // Find user with row lock to prevent race conditions
      const user = await User.findByPk(req.user.id, { 
        lock: true,
        transaction 
      });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Store old balance for logging
      const oldBalance = user.balance;
      
      // Use increment for atomicity
      await user.increment('balance', { 
        by: amount,
        transaction 
      });
      
      // Reload to get updated balance
      await user.reload({ transaction });
      
      // Create transaction record if StoreTransaction model exists
      if (StoreTransaction) {
        await StoreTransaction.create({
          user_id: req.user.id,
          chips_added: amount,
          gems_added: 0,
          type: 'add_chips',
          source,
          timestamp: new Date()
        }, { transaction });
      }
      
      // Commit transaction
      await transaction.commit();
      
      // Clear balance cache
      await clearCache('/balance');
      
      console.log('Chips added successfully:', {
        userId: user.id,
        oldBalance,
        newBalance: user.balance,
        amount,
        source,
        timestamp: new Date().toISOString()
      });
      
      return res.json({
        success: true,
        new_balance: user.balance,
        old_balance: oldBalance,
        amount_added: amount,
        message: 'Chips added successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error adding chips:', {
      error: error.message,
      stack: error.stack,
      userId: req?.user?.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: 'Error adding chips',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Subtract chips incrementally
router.post('/subtract-chips', authenticateToken, async (req, res) => {
  console.log('Subtract chips request received:', {
    userId: req?.user?.id,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { amount, source = 'general' } = req.body;
    
    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      console.log('Subtract chips failed: Invalid amount', {
        userId: req?.user?.id,
        amount,
        type: typeof amount
      });
      return res.status(400).json({ message: 'Invalid amount value' });
    }
    
    // Use transaction for data integrity
    const transaction = await sequelize.transaction();
    
    try {
      // Find user with row lock
      const user = await User.findByPk(req.user.id, { 
        lock: true,
        transaction 
      });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has enough balance
      if (user.balance < amount) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      
      // Store old balance for logging
      const oldBalance = user.balance;
      
      // Use decrement for atomicity
      await user.decrement('balance', { 
        by: amount,
        transaction 
      });
      
      // Reload to get updated balance
      await user.reload({ transaction });
      
      // Create transaction record if StoreTransaction model exists
      if (StoreTransaction) {
        await StoreTransaction.create({
          user_id: req.user.id,
          chips_added: -amount, // Negative for subtraction
          gems_added: 0,
          type: 'subtract_chips',
          source,
          timestamp: new Date()
        }, { transaction });
      }
      
      // Commit transaction
      await transaction.commit();
      
      // Clear balance cache
      await clearCache('/balance');
      
      console.log('Chips subtracted successfully:', {
        userId: user.id,
        oldBalance,
        newBalance: user.balance,
        amount,
        source,
        timestamp: new Date().toISOString()
      });
      
      return res.json({
        success: true,
        new_balance: user.balance,
        old_balance: oldBalance,
        amount_subtracted: amount,
        message: 'Chips subtracted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error subtracting chips:', {
      error: error.message,
      stack: error.stack,
      userId: req?.user?.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: 'Error subtracting chips',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add gems incrementally
router.post('/add-gems', authenticateToken, async (req, res) => {
  console.log('Add gems request received:', {
    userId: req?.user?.id,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { amount, source = 'general' } = req.body;
    
    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      console.log('Add gems failed: Invalid amount', {
        userId: req?.user?.id,
        amount,
        type: typeof amount
      });
      return res.status(400).json({ message: 'Invalid amount value' });
    }
    
    // Use transaction for data integrity
    const transaction = await sequelize.transaction();
    
    try {
      // Find user with row lock to prevent race conditions
      const user = await User.findByPk(req.user.id, { 
        lock: true,
        transaction 
      });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Store old gems for logging
      const oldGems = user.gems;
      
      // Use increment for atomicity
      await user.increment('gems', { 
        by: amount,
        transaction 
      });
      
      // Reload to get updated gems
      await user.reload({ transaction });
      
      // Create transaction record if StoreTransaction model exists
      if (StoreTransaction) {
        await StoreTransaction.create({
          user_id: req.user.id,
          chips_added: 0,
          gems_added: amount,
          type: 'add_gems',
          source,
          timestamp: new Date()
        }, { transaction });
      }
      
      // Commit transaction
      await transaction.commit();
      
      console.log('Gems added successfully:', {
        userId: user.id,
        oldGems,
        newGems: user.gems,
        amount,
        source,
        timestamp: new Date().toISOString()
      });
      
      return res.json({
        success: true,
        new_gems: user.gems,
        old_gems: oldGems,
        amount_added: amount,
        message: 'Gems added successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error adding gems:', {
      error: error.message,
      stack: error.stack,
      userId: req?.user?.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: 'Error adding gems',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Subtract gems incrementally
router.post('/subtract-gems', authenticateToken, async (req, res) => {
  console.log('Subtract gems request received:', {
    userId: req?.user?.id,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  try {
    const { amount, source = 'general' } = req.body;
    
    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      console.log('Subtract gems failed: Invalid amount', {
        userId: req?.user?.id,
        amount,
        type: typeof amount
      });
      return res.status(400).json({ message: 'Invalid amount value' });
    }
    
    // Use transaction for data integrity
    const transaction = await sequelize.transaction();
    
    try {
      // Find user with row lock
      const user = await User.findByPk(req.user.id, { 
        lock: true,
        transaction 
      });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has enough gems
      if (user.gems < amount) {
        await transaction.rollback();
        return res.status(400).json({ message: 'Insufficient gems' });
      }
      
      // Store old gems for logging
      const oldGems = user.gems;
      
      // Use decrement for atomicity
      await user.decrement('gems', { 
        by: amount,
        transaction 
      });
      
      // Reload to get updated gems
      await user.reload({ transaction });
      
      // Create transaction record if StoreTransaction model exists
      if (StoreTransaction) {
        await StoreTransaction.create({
          user_id: req.user.id,
          chips_added: 0,
          gems_added: -amount, // Negative for subtraction
          type: 'subtract_gems',
          source,
          timestamp: new Date()
        }, { transaction });
      }
      
      // Commit transaction
      await transaction.commit();
      
      console.log('Gems subtracted successfully:', {
        userId: user.id,
        oldGems,
        newGems: user.gems,
        amount,
        source,
        timestamp: new Date().toISOString()
      });
      
      return res.json({
        success: true,
        new_gems: user.gems,
        old_gems: oldGems,
        amount_subtracted: amount,
        message: 'Gems subtracted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error subtracting gems:', {
      error: error.message,
      stack: error.stack,
      userId: req?.user?.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: 'Error subtracting gems',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Claim free chips
router.post('/claim-free-chips', authenticateToken, async (req, res) => {
  console.log('Free chips claim request received:', {
    userId: req?.user?.id,
    timestamp: new Date().toISOString()
  });

  try {
    const FREE_CHIPS_AMOUNT = 100000; // Could be made configurable
    const FREE_CHIPS_COOLDOWN = 4 * 60 * 60; // 4 hours in seconds
    
    // Use transaction for data integrity
    const transaction = await sequelize.transaction();
    
    try {
      // Find user with row lock
      const user = await User.findByPk(req.user.id, { 
        lock: true,
        transaction 
      });
      
      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if enough time has passed since last claim
      const currentTime = Math.floor(Date.now() / 1000);
      const lastClaimTime = user.last_free_chips_claim || 0;
      
      if (currentTime - lastClaimTime < FREE_CHIPS_COOLDOWN) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false,
          message: 'Too soon to claim free chips',
          time_remaining: FREE_CHIPS_COOLDOWN - (currentTime - lastClaimTime),
          next_claim_time: lastClaimTime + FREE_CHIPS_COOLDOWN
        });
      }
      
      // Store old balance
      const oldBalance = user.balance;
      
      // Update balance and last claim time
      await user.increment('balance', { 
        by: FREE_CHIPS_AMOUNT,
        transaction 
      });
      
      user.last_free_chips_claim = currentTime;
      await user.save({ transaction });
      
      // Reload to get updated balance
      await user.reload({ transaction });
      
      // Create transaction record if StoreTransaction model exists
      if (StoreTransaction) {
        await StoreTransaction.create({
          user_id: req.user.id,
          chips_added: FREE_CHIPS_AMOUNT,
          gems_added: 0,
          type: 'free_chips',
          source: 'free_claim',
          timestamp: new Date()
        }, { transaction });
      }
      
      // Commit transaction
      await transaction.commit();
      
      // Clear balance cache
      await clearCache('/balance');
      
      console.log('Free chips claimed successfully:', {
        userId: user.id,
        oldBalance,
        newBalance: user.balance,
        amount: FREE_CHIPS_AMOUNT,
        lastClaimTime: currentTime,
        timestamp: new Date().toISOString()
      });
      
      return res.json({
        success: true,
        new_balance: user.balance,
        old_balance: oldBalance,
        amount_added: FREE_CHIPS_AMOUNT,
        last_free_chips_claim: currentTime,
        message: 'Free chips claimed successfully'
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error claiming free chips:', {
      error: error.message,
      stack: error.stack,
      userId: req?.user?.id,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: 'Error claiming free chips',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
