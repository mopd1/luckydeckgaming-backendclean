const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

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

// Get user's current balance
router.get('/balance', authenticateToken, async (req, res) => {
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

module.exports = router;
