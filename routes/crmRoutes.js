// routes/crmRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, validateAdmin } = require('../middleware/auth');
const db = require('../models');
const { Op } = require('sequelize');
const { cacheMiddleware, clearCache } = require('../middleware/cache');

// Get all messages for the current user
router.get('/messages', authenticateToken, cacheMiddleware(120), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all messages for this user that aren't archived
    const userMessages = await db.UserCRMMessage.findAll({
      where: {
        user_id: userId,
        archived: false
      },
      include: [
        {
          model: db.CRMMessage,
          include: [
            {
              model: db.CRMCharacter,
              as: 'character',
              attributes: ['name', 'title', 'avatar_data'],
              required: false
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    // Format the messages for API response
    const messages = userMessages.map(userMessage => {
      const message = userMessage.CRMMessage;
      const senderCharacter = message.character;
      return {
        id: userMessage.id,
        message_id: message.id,
        title: message.title,
        content: message.content,
        image_url: message.image_url,
        sender_name: senderCharacter ? senderCharacter.name : 'System',
        sender_title: senderCharacter ? senderCharacter.title : null,
        sender_avatar_data: senderCharacter ? senderCharacter.avatar_data : null,
        message_type: message.message_type,
        read: userMessage.read,
        archived: userMessage.archived,
        completed: userMessage.completed,
        reward_claimed: userMessage.reward_claimed,
        reward_type: message.reward_type,
        reward_amount: message.reward_amount,
        task_id: message.task_id,
        task_data: message.task_data,
        created_at: userMessage.created_at
      };
    });
    
    res.status(200).json(messages);
  } catch (error) {
  console.error('Error fetching CRM messages:', error);
  res.status(500).json({ error: 'Failed to fetch messages' });
  }

});

// Get a specific message by ID
router.get('/messages/:id', authenticateToken, cacheMiddleware(300), async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;
    
    // Find the specific user message
    const userMessage = await db.UserCRMMessage.findOne({
      where: {
        id: messageId,
        user_id: userId
      },
      include: [
        {
          model: db.CRMMessage,
          include: [
            {
              model: db.CRMCharacter,
              as: 'character',
              attributes: ['name', 'title', 'avatar_data'],
              required: false
            },
            {
              model: db.DailyTask,
              attributes: ['name', 'description', 'required_repetitions']
            }
          ]
        }
      ]
    });
    
    if (!userMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const message = userMessage.CRMMessage;
    const senderCharacter = message.character;
    
    // Format the message for API response
    const formattedMessage = {
      id: userMessage.id,
      message_id: message.id,
      title: message.title,
      content: message.content,
      image_url: message.image_url,
      sender_name: senderCharacter ? senderCharacter.name : 'System',
      sender_title: senderCharacter ? senderCharacter.title : null,
      sender_avatar_data: message.senderCharacter ? message.senderCharacter.avatar_data : null,
      message_type: message.message_type,
      read: userMessage.read,
      archived: userMessage.archived,
      completed: userMessage.completed,
      reward_claimed: userMessage.reward_claimed,
      reward_type: message.reward_type,
      reward_amount: message.reward_amount,
      task_id: message.task_id,
      task_data: message.task_data,
      created_at: userMessage.created_at
    };
    
    // If this is a task message, include task details
    if (message.DailyTask) {
      formattedMessage.task = {
        name: message.DailyTask.name,
        description: message.DailyTask.description,
        required_repetitions: message.DailyTask.required_repetitions
      };
    }
    
    res.status(200).json(formattedMessage);
  } catch (error) {
    console.error('Error fetching CRM message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// Mark message as read
router.put('/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;
    
    // Find and update the message
    const userMessage = await db.UserCRMMessage.findOne({
      where: {
        id: messageId,
        user_id: userId
      }
    });
    
    if (!userMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    userMessage.read = true;
    await userMessage.save();
    
    // ADD THESE LINES - Clear cache for both the messages list and the specific message
    await clearCache('/messages');
    await clearCache(`/messages/${messageId}`);
    
    res.status(200).json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Archive a message
router.put('/messages/:id/archived', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;
    
    // Find and update the message
    const userMessage = await db.UserCRMMessage.findOne({
      where: {
        id: messageId,
        user_id: userId
      }
    });
    
    if (!userMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    userMessage.archived = true;
    await userMessage.save();
    
    res.status(200).json({ success: true, message: 'Message archived' });
  } catch (error) {
    console.error('Error archiving message:', error);
    res.status(500).json({ error: 'Failed to archive message' });
  }
});

// Complete a task associated with a message
router.put('/messages/:id/complete-task', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;
    
    // Find the user message
    const userMessage = await db.UserCRMMessage.findOne({
      where: {
        id: messageId,
        user_id: userId
      },
      include: [{
        model: db.CRMMessage,
        where: {
          message_type: 'TASK'
        }
      }]
    });
    
    if (!userMessage) {
      return res.status(404).json({ error: 'Task message not found' });
    }
    
    // Check if task is already completed
    if (userMessage.completed) {
      return res.status(400).json({ error: 'Task already completed' });
    }
    
    const message = userMessage.CRMMessage;
    
    // If there's a task_id, update task progress via DailyActionManager
    if (message.task_id) {
      // This is a normal task that uses the daily task system
      const task = await db.DailyTask.findOne({
        where: { task_id: message.task_id }
      });
      
      if (task) {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Find or create progress record
        const [taskProgress, created] = await db.UserTaskProgress.findOrCreate({
          where: {
            user_id: userId,
            task_id: message.task_id,
            tracking_date: today
          },
          defaults: {
            current_repetitions: task.required_repetitions,
            completed: true,
            reward_claimed: true
          }
        });
        
        if (!created) {
          // If record exists, update it
          taskProgress.current_repetitions = task.required_repetitions;
          taskProgress.completed = true;
          taskProgress.reward_claimed = true;
          await taskProgress.save();
        }
        
        // If task has rewards, grant them
        if (message.reward_type && message.reward_amount) {
          const user = await db.User.findByPk(userId);
          
          switch (message.reward_type) {
            case 'gems':
              await user.increment('gems', { by: message.reward_amount });
              break;
            case 'chips':
            case 'balance':
              await user.increment('balance', { by: message.reward_amount });
              break;
            case 'action_points':
              await user.increment('action_points', { by: message.reward_amount });
              break;
          }
        }
      }
    } else if (message.task_data && typeof message.task_data === 'object') {
      // This is a custom task defined only in CRM
      // Handle custom task completion logic here
      // For example, if it's a task to visit a certain scene, we'd just mark it completed
    }
    
    // Mark the user message as completed
    userMessage.completed = true;
    userMessage.reward_claimed = true;
    await userMessage.save();
    
    res.status(200).json({
      success: true,
      message: 'Task completed successfully',
      reward_type: message.reward_type,
      reward_amount: message.reward_amount
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// Claim a reward from a message
router.put('/messages/:id/claim-reward', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;
    
    // Find the user message
    const userMessage = await db.UserCRMMessage.findOne({
      where: {
        id: messageId,
        user_id: userId
      },
      include: [{
        model: db.CRMMessage,
        where: {
          message_type: 'REWARD'
        }
      }]
    });
    
    if (!userMessage) {
      return res.status(404).json({ error: 'Reward message not found' });
    }
    
    // Check if reward is already claimed
    if (userMessage.reward_claimed) {
      return res.status(400).json({ error: 'Reward already claimed' });
    }
    
    const message = userMessage.CRMMessage;
    
    // Check if message has a reward
    if (!message.reward_type || !message.reward_amount) {
      return res.status(400).json({ error: 'No reward available for this message' });
    }
    
    // Grant the reward
    const user = await db.User.findByPk(userId);
    
    switch (message.reward_type) {
      case 'gems':
        await user.increment('gems', { by: message.reward_amount });
        break;
      case 'chips':
      case 'balance':
        await user.increment('balance', { by: message.reward_amount });
        break;
      case 'action_points':
        await user.increment('action_points', { by: message.reward_amount });
        break;
      default:
        return res.status(400).json({ error: 'Invalid reward type' });
    }
    
    // Mark the reward as claimed
    userMessage.reward_claimed = true;
    await userMessage.save();
    
    res.status(200).json({
      success: true,
      message: 'Reward claimed successfully',
      reward_type: message.reward_type,
      reward_amount: message.reward_amount
    });
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

// Trigger event endpoint that might create new messages for a user
router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { event_type, event_data = {} } = req.body;
    
    if (!event_type) {
      return res.status(400).json({ error: 'Event type is required' });
    }
    
    // Find messages that match this trigger
    const eligibleMessages = await db.CRMMessage.findAll({
      where: {
        trigger_type: event_type,
        active: true
      }
    });
    
    if (eligibleMessages.length === 0) {
      return res.status(200).json({ new_messages: false, count: 0 });
    }
    
    // Filter messages based on segment data
    const user = await db.User.findByPk(userId, {
      attributes: [
        'id', 'balance', 'gems', 'action_points', 
        'created_at', 'email', 'is_active'
      ]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const matchedMessages = [];
    
    for (const message of eligibleMessages) {
      // Check if message already sent to user
      const existingMessage = await db.UserCRMMessage.findOne({
        where: {
          user_id: userId,
          message_id: message.id
        }
      });
      
      if (existingMessage) {
        continue; // Skip if already sent
      }
      
      // Check if message has segment data and if user matches
      if (message.segment_data && typeof message.segment_data === 'object') {
        // Implement segmentation logic here
        // For example:
        const segment = message.segment_data;
        
// Check balance range
        if (segment.min_balance && user.balance < segment.min_balance) {
          continue;
        }
        if (segment.max_balance && user.balance > segment.max_balance) {
          continue;
        }
        
        // Check gems range
        if (segment.min_gems && user.gems < segment.min_gems) {
          continue;
        }
        if (segment.max_gems && user.gems > segment.max_gems) {
          continue;
        }
        
        // Check user age
        if (segment.min_account_age_days) {
          const accountAge = (new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24);
          if (accountAge < segment.min_account_age_days) {
            continue;
          }
        }
        
        // Add more segmentation criteria as needed
      }
      
      // Check if trigger data is a match with event data
      if (message.trigger_data && typeof message.trigger_data === 'object') {
        const triggerData = message.trigger_data;
        let isMatch = true;
        
        // Check each key in trigger data
        for (const key in triggerData) {
          if (event_data[key] !== triggerData[key]) {
            isMatch = false;
            break;
          }
        }

        if (Object.keys(event_data).length !== Object.keys(triggerData).length) {
          isMatch = false;
        }


        if (!isMatch) {
          continue;
        }
      }
      
      // If we get here, all conditions have been met
      matchedMessages.push(message);
    }
    
    // Create user messages for each match
    const createdMessages = [];
    for (const message of matchedMessages) {
      const userMessage = await db.UserCRMMessage.create({
        user_id: userId,
        message_id: message.id,
        read: false,
        archived: false,
        completed: false,
        reward_claimed: false
      });
      
      createdMessages.push(userMessage);
    }
    
    res.status(200).json({
      new_messages: createdMessages.length > 0,
      count: createdMessages.length
    });
  } catch (error) {
  console.error('Error processing trigger event:', error);
  console.error('Error stack:', error.stack);
  console.error('Error message:', error.message);
  console.error('Event type:', req.body.event_type);
  console.error('User ID:', req.user?.id);
  res.status(500).json({ error: 'Failed to process trigger event', details: error.message });
  }
});

// ----- ADMIN ROUTES -----

// Get all CRM characters (admin only)
router.get('/admin/characters', validateAdmin, cacheMiddleware(3600), async (req, res) => {
  try {
    const characters = await db.CRMCharacter.findAll();
    res.status(200).json({ characters });
  } catch (error) {
    console.error('Error fetching CRM characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// Create a new CRM character (admin only)
router.post('/admin/characters', validateAdmin, async (req, res) => {
  try {
    const { name, title, avatar_data } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Character name is required' });
    }
    
    const character = await db.CRMCharacter.create({
      name,
      title,
      avatar_data
    });
    
    res.status(201).json(character);
  } catch (error) {
    console.error('Error creating CRM character:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

// Update a CRM character (admin only)
router.put('/admin/characters/:id', validateAdmin, async (req, res) => {
  try {
    const characterId = req.params.id;
    const { name, title, avatar_data } = req.body;
    
    const character = await db.CRMCharacter.findByPk(characterId);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    if (name) character.name = name;
    if (title !== undefined) character.title = title;
    if (avatar_data !== undefined) character.avatar_data = avatar_data;
    
    await character.save();
    
    res.status(200).json(character);
  } catch (error) {
    console.error('Error updating CRM character:', error);
    res.status(500).json({ error: 'Failed to update character' });
  }
});

// Delete a CRM character (admin only)
router.delete('/admin/characters/:id', validateAdmin, async (req, res) => {
  try {
    const characterId = req.params.id;
    
    const character = await db.CRMCharacter.findByPk(characterId);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    await character.destroy();
    
    res.status(200).json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Error deleting CRM character:', error);
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

// Get all CRM messages (admin only)
router.get('/admin/messages', validateAdmin, cacheMiddleware(3600), async (req, res) => {
  try {
    const messages = await db.CRMMessage.findAll({
      include: [{ model: db.CRMCharacter }]
    });
    
    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching CRM messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Create a new CRM message (admin only)
router.post('/admin/messages', validateAdmin, async (req, res) => {
  try {
    const {
      title, content, character_id, message_type, task_id, task_data,
      reward_type, reward_amount, trigger_type, trigger_data, segment_data, active, image_url
    } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Validate message type
    const validMessageTypes = ['INFO', 'TASK', 'REWARD'];
    if (!validMessageTypes.includes(message_type)) {
      return res.status(400).json({ error: 'Invalid message type' });
    }
    
    // If task message, validate task_id
    if (message_type === 'TASK' && task_id) {
      const task = await db.DailyTask.findOne({
        where: { task_id: task_id }
      });
      
      if (!task) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
    }
    
    // If reward message, validate reward
    if (message_type === 'REWARD' && (!reward_type || !reward_amount)) {
      return res.status(400).json({ error: 'Reward type and amount are required for reward messages' });
    }
    
    // Create the message
    const message = await db.CRMMessage.create({
      title,
      content,
      character_id,
      message_type,
      task_id,
      task_data,
      reward_type,
      reward_amount,
      trigger_type,
      trigger_data,
      segment_data,
      image_url,
      active: active !== undefined ? active : true
    });
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error creating CRM message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Update a CRM message (admin only)
router.put('/admin/messages/:id', validateAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;
    const {
      title, content, character_id, message_type, task_id, task_data,
      reward_type, reward_amount, trigger_type, trigger_data, segment_data, active, image_url
    } = req.body;
    
    const message = await db.CRMMessage.findByPk(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Update fields
    if (title) message.title = title;
    if (content) message.content = content;
    if (character_id !== undefined) message.character_id = character_id;
    if (image_url !== undefined) message.image_url = image_url;
    if (message_type) {
      const validMessageTypes = ['INFO', 'TASK', 'REWARD'];
      if (!validMessageTypes.includes(message_type)) {
        return res.status(400).json({ error: 'Invalid message type' });
      }
      message.message_type = message_type;
    }
    if (task_id !== undefined) message.task_id = task_id;
    if (task_data !== undefined) message.task_data = task_data;
    if (reward_type !== undefined) message.reward_type = reward_type;
    if (reward_amount !== undefined) message.reward_amount = reward_amount;
    if (trigger_type !== undefined) message.trigger_type = trigger_type;
    if (trigger_data !== undefined) message.trigger_data = trigger_data;
    if (segment_data !== undefined) message.segment_data = segment_data;
    if (active !== undefined) message.active = active;
    
    await message.save();
    
    res.status(200).json(message);
  } catch (error) {
    console.error('Error updating CRM message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete a CRM message (admin only)
router.delete('/admin/messages/:id', validateAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;
    
    const message = await db.CRMMessage.findByPk(messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    await message.destroy();
    
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting CRM message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Send a message to specific users or segments (admin only)
router.post('/admin/send-message', validateAdmin, async (req, res) => {
  try {
    const { message_id, user_ids, segment } = req.body;
    
    if (!message_id) {
      return res.status(400).json({ error: 'Message ID is required' });
    }
    
    if (!user_ids && !segment) {
      return res.status(400).json({ error: 'Either user IDs or segment criteria are required' });
    }
    
    // Find the message
    const message = await db.CRMMessage.findByPk(message_id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    let targetUsers = [];
    
    // If user_ids provided, use those
    if (user_ids && Array.isArray(user_ids)) {
      targetUsers = await db.User.findAll({
        where: { id: { [Op.in]: user_ids } }
      });
    } 
    // Otherwise use segmentation
    else if (segment) {
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
      
      // Find users matching criteria
      targetUsers = await db.User.findAll({ where: whereClause });
    }
    
    // Create user messages for each target user
    const createdMessages = [];
    for (const user of targetUsers) {
      // Check if user already has this message
      const existingMessage = await db.UserCRMMessage.findOne({
        where: {
          user_id: user.id,
          message_id: message.id
        }
      });
      
      if (!existingMessage) {
        const userMessage = await db.UserCRMMessage.create({
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
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
