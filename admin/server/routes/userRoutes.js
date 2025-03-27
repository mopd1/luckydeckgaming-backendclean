const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/userAuth');

// Get users with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    // Handle "all" or negative limit by setting to a high value but not too high
    if (limit <= 0) {
      limit = 1000; // Use a reasonable maximum
    }
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = search ? {
      [Op.or]: [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { display_name: { [Op.like]: `%${search}%` } },
        { first_name: { [Op.like]: `%${search}%` } },
        { surname: { [Op.like]: `%${search}%` } },
        { nickname: { [Op.like]: `%${search}%` } }
      ]
    } : {};

    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['id', 'DESC']],
      attributes: { exclude: ['password'] } // Exclude sensitive data
    });

    res.json({
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      users: rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] } // Exclude sensitive data
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Allow updating specific fields only
    const allowedFields = [
      'is_active', 'account_locked', 'account_locked_until',
      'display_name', 'first_name', 'surname', 'nickname',
      'admin_role', 'is_admin'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await user.update(updates);

    res.json({
      message: 'User updated successfully',
      user: {
        ...user.toJSON(),
        password: undefined // Remove password from response
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
});

// Update user balance
router.put('/:id/balance', authenticateToken, async (req, res) => {
  try {
    const { balance, operation, amount } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (operation && amount) {
      // Calculate new balance based on operation
      let newBalance = parseInt(user.balance) || 0;
      if (operation === 'add') {
        newBalance += parseInt(amount);
      } else if (operation === 'subtract') {
        newBalance -= parseInt(amount);
        if (newBalance < 0) newBalance = 0; // Prevent negative balance
      } else if (operation === 'set') {
        newBalance = parseInt(amount);
      }

      await user.update({ balance: newBalance });
    } else if (balance !== undefined) {
      // Set exact balance
      await user.update({ balance: parseInt(balance) });
    } else {
      return res.status(400).json({ message: 'Invalid balance update parameters' });
    }

    res.json({
      message: 'User balance updated successfully',
      currentBalance: user.balance
    });
  } catch (error) {
    console.error('Error updating user balance:', error);
    res.status(500).json({ message: 'Failed to update user balance', error: error.message });
  }
});

// Update user gems
router.put('/:id/gems', authenticateToken, async (req, res) => {
  try {
    const { gems, operation, amount } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (operation && amount) {
      // Calculate new gems based on operation
      let newGems = parseInt(user.gems) || 0;
      if (operation === 'add') {
        newGems += parseInt(amount);
      } else if (operation === 'subtract') {
        newGems -= parseInt(amount);
        if (newGems < 0) newGems = 0; // Prevent negative gems
      } else if (operation === 'set') {
        newGems = parseInt(amount);
      }

      await user.update({ gems: newGems });
    } else if (gems !== undefined) {
      // Set exact gems
      await user.update({ gems: parseInt(gems) });
    } else {
      return res.status(400).json({ message: 'Invalid gems update parameters' });
    }

    res.json({
      message: 'User gems updated successfully',
      currentGems: user.gems
    });
  } catch (error) {
    console.error('Error updating user gems:', error);
    res.status(500).json({ message: 'Failed to update user gems', error: error.message });
  }
});

module.exports = router;
