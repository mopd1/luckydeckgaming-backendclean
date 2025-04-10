const express = require('express');
const router = express.Router();
const { sequelize, CRMCharacter, CRMMessage, UserCRMMessage, User, DailyTask } = require('../../../models');
const { authenticateToken } = require('../middleware/userAuth');
const { Op } = require('sequelize');

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get all CRM characters
router.get('/admin/characters', async (req, res) => {
  try {
    const characters = await CRMCharacter.findAll({
      order: [['name', 'ASC']]
    });
    
    res.json({ success: true, characters });
  } catch (error) {
    console.error('Error fetching CRM characters:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch characters' });
  }
});

// Get a specific character
router.get('/admin/characters/:id', async (req, res) => {
  try {
    const character = await CRMCharacter.findByPk(req.params.id);

    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }

    res.json({ success: true, character });
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch character' });
  }
});

// Create a new character
router.post('/admin/characters', async (req, res) => {
  try {
    const character = await CRMCharacter.create(req.body);
    res.status(201).json({ success: true, character });
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ success: false, error: 'Failed to create character' });
  }
});

// Update a character
router.put('/admin/characters/:id', async (req, res) => {
  try {
    const character = await CRMCharacter.findByPk(req.params.id);

    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }

    await character.update(req.body);
    res.json({ success: true, character });
  } catch (error) {
    console.error('Error updating character:', error);
    res.status(500).json({ success: false, error: 'Failed to update character' });
  }
});

// Delete a character
router.delete('/admin/characters/:id', async (req, res) => {
  try {
    const character = await CRMCharacter.findByPk(req.params.id);

    if (!character) {
      return res.status(404).json({ success: false, error: 'Character not found' });
    }

    await character.destroy();
    res.status(200).json({ success: true, message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Error deleting character:', error);
    res.status(500).json({ success: false, error: 'Failed to delete character' });
  }
});

// Get all CRM messages
router.get('/admin/messages', async (req, res) => {
  try {
    const messages = await CRMMessage.findAll({
      include: [
        { model: CRMCharacter, as: 'character' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching CRM messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// Get a specific message
router.get('/admin/messages/:id', async (req, res) => {
  try {
    const message = await CRMMessage.findByPk(req.params.id, {
      include: [
        { model: CRMCharacter, as: 'character' },
        { model: DailyTask }
      ]
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch message' });
  }
});

// Create a new message
router.post('/admin/messages', async (req, res) => {
  try {
    const message = await CRMMessage.create(req.body);
    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: 'Failed to create message' });
  }
});

// Update a message
router.put('/admin/messages/:id', async (req, res) => {
  try {
    const message = await CRMMessage.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    await message.update(req.body);
    res.json({ success: true, message });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ success: false, error: 'Failed to update message' });
  }
});

// Delete a message
router.delete('/admin/messages/:id', async (req, res) => {
  try {
    const message = await CRMMessage.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    await message.destroy();
    res.status(200).json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

// Send a message to users
router.post('/admin/send-message', async (req, res) => {
  try {
    const { message_id, user_ids, segment } = req.body;
    
    // Find the message
    const message = await CRMMessage.findByPk(message_id);
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Either user_ids or segment criteria are required' });
    }
    
    let targetUsers = [];
    
    // If user_ids provided, use those
    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      targetUsers = await User.findAll({
        where: { id: { [Op.in]: user_ids } }
      });
    }
    // Otherwise use segmentation
    else if (segment && typeof segment === 'object') {
      const whereClause = {};
      
      // Add segment criteria to where clause
      if (segment.min_balance) {
        whereClause.balance = { ...whereClause.balance, [Op.gte]: segment.min_balance };
      }
      if (segment.max_balance) {
        whereClause.balance = { ...whereClause.balance, [Op.lte]: segment.max_balance };
      }
      
      if (segment.min_gems) {
        whereClause.gems = { ...whereClause.gems, [Op.gte]: segment.min_gems };
      }
      if (segment.max_gems) {
        whereClause.gems = { ...whereClause.gems, [Op.lte]: segment.max_gems };
      }
      
      if (segment.min_action_points) {
        whereClause.action_points = { ...whereClause.action_points, [Op.gte]: segment.min_action_points };
      }
      if (segment.max_action_points) {
        whereClause.action_points = { ...whereClause.action_points, [Op.lte]: segment.max_action_points };
      }
      
      if (segment.is_active !== undefined) {
        whereClause.is_active = segment.is_active;
      }
      
      if (segment.min_account_age_days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - segment.min_account_age_days);
        whereClause.created_at = { ...whereClause.created_at, [Op.lte]: cutoffDate };
      }
      
      if (segment.max_account_age_days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - segment.max_account_age_days);
        whereClause.created_at = { ...whereClause.created_at, [Op.gte]: cutoffDate };
      }
      
      targetUsers = await User.findAll({ where: whereClause });
    } else {
      return res.status(400).json({ error: 'Either user_ids or segment criteria are required' });
    }
    
    // Create user messages for each target user
    const createdMessages = [];
    for (const user of targetUsers) {
      // Check if user already has this message
      const existingMessage = await UserCRMMessage.findOne({
        where: {
          user_id: user.id,
          message_id: message.id
        }
      });
      
      if (!existingMessage) {
        const userMessage = await UserCRMMessage.create({
          user_id: user.id,
          message_id: message.id,
          read: false,
          archived: false,
          completed: false,
          reward_claimed: false
        });
        
        createdMessages.push(userMessage);
      }
    }
    
    res.status(200).json({
      success: true,
      sent_count: createdMessages.length,
      total_target_users: targetUsers.length
    });
  } catch (error) {
    console.error('Error sending message to users:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Get message analytics
router.get('/admin/analytics', async (req, res) => {
  try {
    // Get message statistics using raw SQL for more complex aggregations
    const stats = await sequelize.query(`
      SELECT
        m.id, m.title, m.message_type,
        COUNT(DISTINCT um.user_id) as total_users,
        SUM(CASE WHEN um.read = true THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN um.completed = true THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN um.reward_claimed = true THEN 1 ELSE 0 END) as claimed_count
      FROM crm_messages m
      LEFT JOIN user_crm_messages um ON m.id = um.message_id
      GROUP BY m.id, m.title, m.message_type
      ORDER BY m.created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching CRM analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
