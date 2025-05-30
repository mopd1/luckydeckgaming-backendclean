const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');

const db = require('../models');
const { DailyTask, TaskAction, TaskSet, User, UserTaskProgress, TaskCalendar, TaskSetTasks, Admin } = db;

router.get('/debug', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user; 
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskActionsCount = await TaskAction.count();
    const dailyTasksCount = await DailyTask.count();
    const taskSetsCount = await TaskSet.count();
    const sampleActions = await TaskAction.findAll({ limit: 5 });
    const sampleTasks = await DailyTask.findAll({ limit: 5 });

    res.status(200).json({
      counts: {
        task_actions: taskActionsCount,
        daily_tasks: dailyTasksCount,
        task_sets: taskSetsCount
      },
      samples: {
        task_actions: sampleActions,
        daily_tasks: sampleTasks
      },
      message: 'Debug info retrieved successfully'
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ 
      error: 'Debug endpoint failed',
      details: error.message,
      stack: error.stack
    });
  }
});

router.get('/actions', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;

    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      console.warn(`[DailyTasksRoutes /actions] Unauthorized access attempt by user ID: ${adminUser ? adminUser.id : 'Unknown'}, Role: ${adminUser ? adminUser.role : 'Unknown'}`);
      return res.status(403).json({ error: 'Unauthorized - Insufficient privileges' });
    }

    console.log(`[DailyTasksRoutes /actions] Admin user ID: ${adminUser.id} authorized. Fetching task actions.`);
    const actions = await TaskAction.findAll({
      order: [['name', 'ASC']]
    });
    
    console.log(`[DailyTasksRoutes /actions] Fetched ${actions.length} task actions.`);
    res.status(200).json({ actions });

  } catch (error) {
    console.error('[DailyTasksRoutes /actions] Error fetching task actions:', error);
    res.status(500).json({ error: 'Failed to fetch task actions', details: error.message });
  }
});

router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) { 
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const tasks = await DailyTask.findAll({
      include: [
        { model: TaskAction, as: 'action' },
        { model: TaskSet, as: 'taskSet' } 
      ],
      order: [['id', 'ASC']]
    });
    res.status(200).json({ tasks });
  } catch (error) {
    console.error('Error fetching daily tasks:', error);
    res.status(500).json({ error: 'Failed to fetch daily tasks', details: error.message });
  }
});

router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) { 
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const newTaskData = req.body; 
    if (!newTaskData.task_id || typeof newTaskData.task_id !== 'string' || newTaskData.task_id.trim() === '') {
        return res.status(400).json({ error: 'task_id is required and cannot be empty.' });
    }
    if (!newTaskData.action_id) {
        return res.status(400).json({ error: 'action_id is required.' });
    }

    const newTask = await DailyTask.create(newTaskData);
    res.status(201).json({ task: newTask });
  } catch (error) {
    console.error('Error creating daily task:', error);
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Validation Error or Duplicate Entry', details: error.errors ? error.errors.map(e => e.message) : error.message });
    }
    res.status(500).json({ error: 'Failed to create daily task', details: error.message });
  }
});

router.put('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) { 
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskId = req.params.id; 
    const updatedTaskData = req.body; 

    const task = await DailyTask.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Daily task not found' });
    }

    await task.update(updatedTaskData);
    res.status(200).json({ task });
  } catch (error) {
    console.error(`Error updating daily task ${req.params.id}:`, error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Validation Error', details: error.errors.map(e => e.message) });
    }
    res.status(500).json({ error: 'Failed to update daily task', details: error.message });
  }
});

router.delete('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) { 
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskId = req.params.id;
    const task = await DailyTask.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Daily task not found' });
    }

    await task.destroy();
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting daily task ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete daily task', details: error.message });
  }
});

router.post('/populate-sample-data', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) { 
      return res.status(403).json({ error: 'Unauthorized to populate data' });
    }

    const actionsToCreate = [
      { action_id: 'sample_action_1', name: 'Sample Action One', description: 'This is a sample action.', tracking_event: 'sample_event', collate: 'utf8mb4_unicode_ci' },
      { action_id: 'sample_action_2', name: 'Sample Action Two', description: 'Another sample action.', tracking_event: 'another_event', collate: 'utf8mb4_unicode_ci' },
    ];

    let createdCount = 0;
    for (const actionData of actionsToCreate) {
      const [action, created] = await TaskAction.findOrCreate({
        where: { action_id: actionData.action_id },
        defaults: actionData
      });
      if (created) {
        createdCount++;
      }
    }

    res.status(200).json({ message: `Sample data population attempt complete. ${createdCount} new task actions created.` });
  } catch (error) {
    console.error('Error in /populate-sample-data endpoint:', error);
    res.status(500).json({ error: 'Failed to populate sample data', details: error.message });
  }
});

module.exports = router;
