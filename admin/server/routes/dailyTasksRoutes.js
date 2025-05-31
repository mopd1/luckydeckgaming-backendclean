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

// =====================================
// TASK SETS ROUTES
// =====================================

// GET /api/daily-tasks/sets - Fetch all task sets
router.get('/sets', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    console.log(`[DailyTasksRoutes /sets] Admin user ID: ${adminUser.id} fetching task sets.`);
    
    const taskSets = await TaskSet.findAll({
      include: [
        {
          model: DailyTask,
          as: 'dailyTasks',
          through: { attributes: ['display_order'] },
          include: [
            { model: TaskAction, as: 'action' }
          ]
        }
      ],
      order: [['id', 'ASC']]
    });

    console.log(`[DailyTasksRoutes /sets] Fetched ${taskSets.length} task sets.`);
    res.status(200).json({ taskSets });

  } catch (error) {
    console.error('[DailyTasksRoutes /sets] Error fetching task sets:', error);
    res.status(500).json({ error: 'Failed to fetch task sets', details: error.message });
  }
});

// POST /api/daily-tasks/sets - Create a new task set
router.post('/sets', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { set_id, name, description, is_active = true, task_ids = [] } = req.body;

    // Validation
    if (!set_id || typeof set_id !== 'string' || set_id.trim() === '') {
      return res.status(400).json({ error: 'set_id is required and cannot be empty.' });
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'name is required and cannot be empty.' });
    }

    console.log(`[DailyTasksRoutes /sets POST] Creating new task set: ${set_id}`);

    // Create the task set
    const newTaskSet = await TaskSet.create({
      set_id: set_id.trim(),
      name: name.trim(),
      description: description ? description.trim() : null,
      is_active
    });

    // Add tasks to the set if provided
    if (task_ids && Array.isArray(task_ids) && task_ids.length > 0) {
      const taskSetTasksData = task_ids.map((task_id, index) => ({
        set_id: newTaskSet.set_id,
        task_id,
        display_order: index + 1
      }));

      await TaskSetTasks.bulkCreate(taskSetTasksData);
      console.log(`[DailyTasksRoutes /sets POST] Added ${task_ids.length} tasks to set.`);
    }

    // Fetch the complete task set with associated tasks
    const completeTaskSet = await TaskSet.findOne({
      where: { set_id: newTaskSet.set_id },
      include: [
        {
          model: DailyTask,
          as: 'dailyTasks',
          through: { attributes: ['display_order'] },
          include: [
            { model: TaskAction, as: 'action' }
          ]
        }
      ]
    });

    console.log(`[DailyTasksRoutes /sets POST] Task set created successfully: ${set_id}`);
    res.status(201).json({ taskSet: completeTaskSet });

  } catch (error) {
    console.error('[DailyTasksRoutes /sets POST] Error creating task set:', error);
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        error: 'Validation Error or Duplicate Entry', 
        details: error.errors ? error.errors.map(e => e.message) : error.message 
      });
    }
    res.status(500).json({ error: 'Failed to create task set', details: error.message });
  }
});

// PUT /api/daily-tasks/sets/:id - Update an existing task set
router.put('/sets/:id', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskSetId = req.params.id;
    const { name, description, is_active, task_ids } = req.body;

    console.log(`[DailyTasksRoutes /sets PUT] Updating task set ID: ${taskSetId}`);

    // Find the task set
    const taskSet = await TaskSet.findByPk(taskSetId);
    if (!taskSet) {
      return res.status(404).json({ error: 'Task set not found' });
    }

    // Update basic fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length > 0) {
      await taskSet.update(updateData);
    }

    // Update task associations if provided
    if (task_ids && Array.isArray(task_ids)) {
      // Remove existing associations
      await TaskSetTasks.destroy({
        where: { set_id: taskSet.set_id }
      });

      // Add new associations
      if (task_ids.length > 0) {
        const taskSetTasksData = task_ids.map((task_id, index) => ({
          set_id: taskSet.set_id,
          task_id,
          display_order: index + 1
        }));

        await TaskSetTasks.bulkCreate(taskSetTasksData);
      }
      console.log(`[DailyTasksRoutes /sets PUT] Updated task associations: ${task_ids.length} tasks`);
    }

    // Fetch the updated task set with associations
    const updatedTaskSet = await TaskSet.findOne({
      where: { id: taskSetId },
      include: [
        {
          model: DailyTask,
          as: 'dailyTasks',
          through: { attributes: ['display_order'] },
          include: [
            { model: TaskAction, as: 'action' }
          ]
        }
      ]
    });

    console.log(`[DailyTasksRoutes /sets PUT] Task set updated successfully: ${taskSetId}`);
    res.status(200).json({ taskSet: updatedTaskSet });

  } catch (error) {
    console.error(`[DailyTasksRoutes /sets PUT] Error updating task set ${req.params.id}:`, error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation Error', 
        details: error.errors.map(e => e.message) 
      });
    }
    res.status(500).json({ error: 'Failed to update task set', details: error.message });
  }
});

// DELETE /api/daily-tasks/sets/:id - Delete a task set
router.delete('/sets/:id', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskSetId = req.params.id;
    console.log(`[DailyTasksRoutes /sets DELETE] Deleting task set ID: ${taskSetId}`);

    const taskSet = await TaskSet.findByPk(taskSetId);
    if (!taskSet) {
      return res.status(404).json({ error: 'Task set not found' });
    }

    // Delete associated TaskSetTasks first (due to foreign key constraints)
    await TaskSetTasks.destroy({
      where: { set_id: taskSet.set_id }
    });

    // Delete the task set
    await taskSet.destroy();

    console.log(`[DailyTasksRoutes /sets DELETE] Task set deleted successfully: ${taskSetId}`);
    res.status(204).send();

  } catch (error) {
    console.error(`[DailyTasksRoutes /sets DELETE] Error deleting task set ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete task set', details: error.message });
  }
});

// GET /api/daily-tasks/sets/:id/tasks - Get tasks for a specific task set
router.get('/sets/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskSetId = req.params.id;
    console.log(`[DailyTasksRoutes /sets/:id/tasks] Fetching tasks for set ID: ${taskSetId}`);

    const taskSet = await TaskSet.findByPk(taskSetId, {
      include: [
        {
          model: DailyTask,
          as: 'dailyTasks',
          through: { attributes: ['display_order'] },
          include: [
            { model: TaskAction, as: 'action' }
          ]
        }
      ]
    });

    if (!taskSet) {
      return res.status(404).json({ error: 'Task set not found' });
    }

    console.log(`[DailyTasksRoutes /sets/:id/tasks] Found ${taskSet.dailyTasks.length} tasks in set.`);
    res.status(200).json({ 
      taskSet: {
        id: taskSet.id,
        set_id: taskSet.set_id,
        name: taskSet.name,
        description: taskSet.description,
        is_active: taskSet.is_active
      },
      tasks: taskSet.dailyTasks 
    });

  } catch (error) {
    console.error(`[DailyTasksRoutes /sets/:id/tasks] Error fetching tasks for set ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch tasks for task set', details: error.message });
  }
});

module.exports = router;
