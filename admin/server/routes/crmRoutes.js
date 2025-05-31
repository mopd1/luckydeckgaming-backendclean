const express = require('express');
const router = express.Router();
const { sequelize, CRMCharacter, CRMMessage, UserCRMMessage, User, DailyTask } = require('../models');
const { authenticateToken } = require('../middleware/userAuth');
const { Op } = require('sequelize');

router.use(authenticateToken);

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

router.post('/admin/characters', async (req, res) => {
  try {
    const character = await CRMCharacter.create(req.body);
    res.status(201).json({ success: true, character });
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ success: false, error: 'Failed to create character' });
  }
});

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

router.get('/admin/messages/:id', async (req, res) => {
  try {
    const message = await CRMMessage.findByPk(req.params.id);
    
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    let character = null;
    if (message.character_id) {
      try {
        character = await CRMCharacter.findByPk(message.character_id);
      } catch (charError) {
        console.error('Error fetching character:', charError.message);
      }
    }

    const responseMessage = message.toJSON();
    if (character) {
      responseMessage.character = character.toJSON();
    }

    res.json({ success: true, message: responseMessage });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch message' });
  }
});

router.post('/admin/messages', async (req, res) => {
  try {
    const message = await CRMMessage.create(req.body);
    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, error: 'Failed to create message' });
  }
});

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

router.post('/admin/send-message', async (req, res) => {
  try {
    const { message_id, user_ids, segment } = req.body;
    
    const message = await CRMMessage.findByPk(message_id);
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Either user_ids or segment criteria are required' });
    }
    
    let targetUsers = [];
    
    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      targetUsers = await User.findAll({
        where: { id: { [Op.in]: user_ids } }
      });
    }
    else if (segment && typeof segment === 'object') {
      const whereClause = {};
      
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
    
    const createdMessages = [];
    for (const user of targetUsers) {
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

router.get('/admin/analytics', async (req, res) => {
  try {
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
