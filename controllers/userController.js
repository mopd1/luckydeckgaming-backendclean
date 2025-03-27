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

module.exports = {
    searchUsers,
    getUserDetails,
    adjustUserBalance,
    updateUserStatus
};
