const { User } = require('../models');  // Use Sequelize models
const { Op } = require('sequelize');    // For operators like LIKE

const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { username: { [Op.like]: `%${query}%` } },
                    { email: { [Op.like]: `%${query}%` } }
                ]
            },
            attributes: ['id', 'username', 'email', 'balance', 'gems']  // Changed chips to balance
        });
        res.json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            attributes: ['id', 'username', 'email', 'balance', 'gems', 'created_at']
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error getting user details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    searchUsers,
    getUserDetails,
};

const adjustUserBalance = async (req, res) => {
    try {
        res.json({ message: 'Adjust user balance endpoint - To be implemented' });
    } catch (error) {
        console.error('Error adjusting user balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateUserStatus = async (req, res) => {
    try {
        res.json({ message: 'Update user status endpoint - To be implemented' });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Update action points
const updateActionPoints = async (req, res) => {
  try {
    // Get user ID from auth token (req.user should be set by auth middleware)
    const userId = req.user.id;
    
    // Log for debugging
    console.log("Updating action points for user ID:", userId);
    
    // Get new action points value from request body
    const { action_points } = req.body;
    
    if (action_points === undefined) {
      return res.status(400).json({ message: "Missing action_points parameter" });
    }
    
    // Find user by ID
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.error(`User with ID ${userId} not found`);
      return res.status(404).json({ message: "User not found" });
    }
    
    // Update action points
    user.action_points = action_points;
    await user.save();
    
    return res.status(200).json({ 
      success: true, 
      action_points: user.action_points,
      message: "Action points updated successfully" 
    });
  } catch (error) {
    console.error("Error updating action points:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
    searchUsers,
    getUserDetails,
    adjustUserBalance,
    updateUserStatus,
    updateActionPoints
};
