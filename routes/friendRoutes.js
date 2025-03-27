const express = require('express');
const router = express.Router();
const { User, UserStatus, Friendship, Message, Notification } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const searchLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10 // limit each IP to 10 requests per windowMs
});

// Search users
router.get('/search', authenticateToken, searchLimit, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.length < 3) {
            return res.status(400).json({ message: 'Search query must be at least 3 characters' });
        }

        const users = await User.findAll({
            where: {
                username: {
                    [Op.like]: `%${query}%`
                },
                id: {
                    [Op.ne]: req.user.id // Exclude current user
                }
            },
            limit: 10,
            attributes: ['id', 'username'], // Only return necessary fields
            include: [{
                model: UserStatus,
                as: 'Status',
                attributes: ['status']
            }]
        });

        res.json(users);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Error searching users' });
    }
});

// Send friend request
router.post('/request', authenticateToken, async (req, res) => {
    try {
        const { friendId } = req.body;
        
        // Check if friendship already exists
        const existingFriendship = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { user_id: req.user.id, friend_id: friendId },
                    { user_id: friendId, friend_id: req.user.id }
                ]
            }
        });

        if (existingFriendship) {
            return res.status(400).json({ message: 'Friendship request already exists' });
        }

        // Create friendship request
        const friendship = await Friendship.create({
            user_id: req.user.id,
            friend_id: friendId,
            status: 'pending'
        });

        // Create notification for receiver
        await Notification.create({
            user_id: friendId,
            from_user_id: req.user.id,
            type: 'friend_request',
            status: 'unread'
        });

        res.json({ message: 'Friend request sent', friendship });
    } catch (error) {
        console.error('Friend request error:', error);
        res.status(500).json({ message: 'Error sending friend request' });
    }
});

// Respond to friend request
router.put('/request/:id', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const requestId = parseInt(req.params.id);

        // Find the friendship record
        const friendship = await Friendship.findByPk(requestId);
        
        if (!friendship) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        if (friendship.friend_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to respond to this request' });
        }

        if (status === 'accepted') {
            // Update the friendship status
            await friendship.update({ status: 'accepted' });
            res.json({
                message: 'Friend request accepted',
                friendship: friendship
            });
        } else if (status === 'rejected') {
            // Delete the friendship record instead of updating status
            await friendship.destroy();
            res.json({
                message: 'Friend request rejected',
                friendship: {
                    id: requestId,
                    status: 'rejected'
                }
            });
        } else {
            res.status(400).json({ message: 'Invalid status' });
        }
    } catch (error) {
        console.error('Error processing friend request response:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get friends list
router.get('/list', authenticateToken, async (req, res) => {
    try {
        const friends = await Friendship.findAll({
            where: {
                [Op.or]: [
                    { user_id: req.user.id },
                    { friend_id: req.user.id }
                ],
                status: 'accepted'
            },
            include: [{
                model: User,
                as: 'User',
                attributes: ['id', 'username'],
                include: [{
                    model: UserStatus,
                    as: 'Status',
                    attributes: ['status']
                }]
            }, {
                model: User,
                as: 'Friend',
                attributes: ['id', 'username'],
                include: [{
                    model: UserStatus,
                    as: 'Status',
                    attributes: ['status']
                }]
            }]
        });

        // Format the response to show the friend's information regardless of whether they're in user_id or friend_id
        const formattedFriends = friends.map(friendship => {
            const isFriend = friendship.friend_id === req.user.id;
            return {
                id: isFriend ? friendship.user_id : friendship.friend_id,
                username: isFriend ? friendship.User.username : friendship.Friend.username,
                status: isFriend ? friendship.User.Status?.status : friendship.Friend.Status?.status
            };
        });

        res.json(formattedFriends);
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ message: 'Error getting friends list' });
    }
});

// Get pending friend requests
router.get('/pending', authenticateToken, async (req, res) => {
    try {
        const pendingRequests = await Friendship.findAll({
            where: {
                friend_id: req.user.id,
                status: 'pending'
            },
            include: [{
                model: User,
                as: 'User',
                attributes: ['id', 'username']
            }]
        });

        res.json(pendingRequests);
    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({ message: 'Error getting pending requests' });
    }
});

// Send message
router.post('/message', authenticateToken, async (req, res) => {
    try {
        const { receiverId, content } = req.body;

        // Verify friendship exists and is accepted
        const friendship = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { user_id: req.user.id, friend_id: receiverId },
                    { user_id: receiverId, friend_id: req.user.id }
                ],
                status: 'accepted'
            }
        });

        if (!friendship) {
            return res.status(403).json({ message: 'Must be friends to send messages' });
        }

        const message = await Message.create({
            sender_id: req.user.id,
            receiver_id: receiverId,
            content,
            status: 'sent'
        });

        // Create notification for receiver
        await Notification.create({
            user_id: receiverId,
            from_user_id: req.user.id,
            type: 'message',
            status: 'unread'
        });

        res.json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Error sending message' });
    }
});

// Get chat history
router.get('/messages/:friendId', authenticateToken, async (req, res) => {
    try {
        const { friendId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        // Verify friendship exists and is accepted
        const friendship = await Friendship.findOne({
            where: {
                [Op.or]: [
                    { user_id: req.user.id, friend_id: friendId },
                    { user_id: friendId, friend_id: req.user.id }
                ],
                status: 'accepted'
            }
        });

        if (!friendship) {
            return res.status(403).json({ message: 'Must be friends to view messages' });
        }

        const messages = await Message.findAndCountAll({
            where: {
                [Op.or]: [
                    { sender_id: req.user.id, receiver_id: friendId },
                    { sender_id: friendId, receiver_id: req.user.id }
                ]
            },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });

        res.json({
            messages: messages.rows,
            total: messages.count,
            totalPages: Math.ceil(messages.count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Error getting messages' });
    }
});

// Mark messages as read
router.put('/messages/read/:friendId', authenticateToken, async (req, res) => {
    try {
        const { friendId } = req.params;

        await Message.update(
            { status: 'read' },
            {
                where: {
                    sender_id: friendId,
                    receiver_id: req.user.id,
                    status: {
                        [Op.ne]: 'read'
                    }
                }
            }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark messages read error:', error);
        res.status(500).json({ message: 'Error marking messages as read' });
    }
});

module.exports = router;
