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

// POST /api/daily-tasks/sets/:id/tasks - Add a task to a task set
router.post('/sets/:id/tasks', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskSetId = req.params.id;
    const { task_id, display_order = 0 } = req.body;

    console.log(`[DailyTasksRoutes /sets/:id/tasks POST] Adding task ${task_id} to set ID: ${taskSetId}`);

    // Find the task set
    const taskSet = await TaskSet.findByPk(taskSetId);
    if (!taskSet) {
      return res.status(404).json({ error: 'Task set not found' });
    }

    // Verify the task exists
    const task = await DailyTask.findOne({ where: { task_id } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if task is already in the set
    const existingAssociation = await TaskSetTasks.findOne({
      where: { set_id: taskSet.set_id, task_id }
    });

    if (existingAssociation) {
      return res.status(400).json({ error: 'Task is already in this set' });
    }

    // Add the task to the set
    const taskSetTask = await TaskSetTasks.create({
      set_id: taskSet.set_id,
      task_id,
      display_order: parseInt(display_order) || 0
    });

    console.log(`[DailyTasksRoutes /sets/:id/tasks POST] Task added successfully`);
    res.status(201).json({ 
      message: 'Task added to set successfully',
      taskSetTask 
    });

  } catch (error) {
    console.error(`[DailyTasksRoutes /sets/:id/tasks POST] Error adding task to set:`, error);
    res.status(500).json({ error: 'Failed to add task to set', details: error.message });
  }
});

// PUT /api/daily-tasks/sets/:id/tasks/:task_id - Update task order in a set
router.put('/sets/:id/tasks/:task_id', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskSetId = req.params.id;
    const taskId = req.params.task_id;
    const { display_order } = req.body;

    console.log(`[DailyTasksRoutes /sets/:id/tasks/:task_id PUT] Updating task ${taskId} order in set ID: ${taskSetId}`);

    // Find the task set
    const taskSet = await TaskSet.findByPk(taskSetId);
    if (!taskSet) {
      return res.status(404).json({ error: 'Task set not found' });
    }

    // Find the task association
    const taskSetTask = await TaskSetTasks.findOne({
      where: { set_id: taskSet.set_id, task_id: taskId }
    });

    if (!taskSetTask) {
      return res.status(404).json({ error: 'Task not found in this set' });
    }

    // Update the display order
    if (display_order !== undefined) {
      await taskSetTask.update({ display_order: parseInt(display_order) || 0 });
    }

    console.log(`[DailyTasksRoutes /sets/:id/tasks/:task_id PUT] Task order updated successfully`);
    res.status(200).json({ 
      message: 'Task order updated successfully',
      taskSetTask 
    });

  } catch (error) {
    console.error(`[DailyTasksRoutes /sets/:id/tasks/:task_id PUT] Error updating task order:`, error);
    res.status(500).json({ error: 'Failed to update task order', details: error.message });
  }
});

// DELETE /api/daily-tasks/sets/:id/tasks/:task_id - Remove task from a set
router.delete('/sets/:id/tasks/:task_id', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskSetId = req.params.id;
    const taskId = req.params.task_id;

    console.log(`[DailyTasksRoutes /sets/:id/tasks/:task_id DELETE] Removing task ${taskId} from set ID: ${taskSetId}`);

    // Find the task set
    const taskSet = await TaskSet.findByPk(taskSetId);
    if (!taskSet) {
      return res.status(404).json({ error: 'Task set not found' });
    }

    // Find and delete the task association
    const taskSetTask = await TaskSetTasks.findOne({
      where: { set_id: taskSet.set_id, task_id: taskId }
    });

    if (!taskSetTask) {
      return res.status(404).json({ error: 'Task not found in this set' });
    }

    await taskSetTask.destroy();

    console.log(`[DailyTasksRoutes /sets/:id/tasks/:task_id DELETE] Task removed successfully`);
    res.status(204).send();

  } catch (error) {
    console.error(`[DailyTasksRoutes /sets/:id/tasks/:task_id DELETE] Error removing task from set:`, error);
    res.status(500).json({ error: 'Failed to remove task from set', details: error.message });
  }
});

// =====================================
// CALENDAR ROUTES
// =====================================

// GET /api/daily-tasks/calendar/:year/:month - Get calendar data for a specific month
router.get('/calendar/:year/:month', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { year, month } = req.params;
    
    console.log(`[DailyTasksRoutes /calendar] Fetching calendar data for ${year}/${month}`);

    // Get calendar assignments for the specified month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const calendarAssignments = await TaskCalendar.findAll({
      where: {
        date: {
          [db.Sequelize.Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: TaskSet,
          attributes: ['set_id', 'name']
        }
      ]
    });

    // Format calendar data as expected by frontend
    const calendar = {};
    calendarAssignments.forEach(assignment => {
      calendar[assignment.date] = {
        set_id: assignment.set_id,
        set_name: assignment.TaskSet?.name || 'Unknown Set'
      };
    });

    console.log(`[DailyTasksRoutes /calendar] Found ${calendarAssignments.length} calendar assignments`);
    res.status(200).json({ calendar });

  } catch (error) {
    console.error(`[DailyTasksRoutes /calendar] Error fetching calendar data:`, error);
    res.status(500).json({ error: 'Failed to fetch calendar data', details: error.message });
  }
});

// POST /api/daily-tasks/calendar/set-dates - Assign a task set to specific dates
router.post('/calendar/set-dates', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { setId, dates } = req.body;

    if (!setId || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'setId and dates array are required' });
    }

    console.log(`[DailyTasksRoutes /calendar/set-dates] Assigning set ${setId} to ${dates.length} dates`);

    // Verify the task set exists
    const taskSet = await TaskSet.findOne({ where: { set_id: setId } });
    if (!taskSet) {
      return res.status(404).json({ error: 'Task set not found' });
    }

    // Remove existing assignments for these dates
    await TaskCalendar.destroy({
      where: {
        date: {
          [db.Sequelize.Op.in]: dates
        }
      }
    });

    // Create new assignments
    const calendarAssignments = dates.map(date => ({
      set_id: setId,
      date: date
    }));

    await TaskCalendar.bulkCreate(calendarAssignments);

    console.log(`[DailyTasksRoutes /calendar/set-dates] Successfully assigned task set to dates`);
    res.status(201).json({ 
      message: 'Task set assigned to dates successfully',
      assignedDates: dates.length
    });

  } catch (error) {
    console.error(`[DailyTasksRoutes /calendar/set-dates] Error assigning task set to dates:`, error);
    res.status(500).json({ error: 'Failed to assign task set to dates', details: error.message });
  }
});
     
// GET /api/daily-tasks/calendar/assignments - Get all calendar assignments (optional endpoint for debugging)
router.get('/calendar/assignments', authenticateToken, async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const assignments = await TaskCalendar.findAll({
      include: [
        {
          model: TaskSet,
          as: 'taskSet',
          attributes: ['set_id', 'name', 'description']
        }
      ],
      order: [['assignment_date', 'ASC']]
    });

    console.log(`[DailyTasksRoutes /calendar/assignments] Found ${assignments.length} total assignments`);
    res.status(200).json({ assignments });

  } catch (error) {
    console.error(`[DailyTasksRoutes /calendar/assignments] Error fetching assignments:`, error);
    res.status(500).json({ error: 'Failed to fetch calendar assignments', details: error.message });
  }
});

module.exports = router;
