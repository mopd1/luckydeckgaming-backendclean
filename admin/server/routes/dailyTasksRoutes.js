const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Import models from the local models directory
const db = require('../models');
const { DailyTask, TaskAction, TaskSet, User, UserTaskProgress, TaskCalendar, TaskSetTasks } = db;

// Get all task actions (for dropdown)
router.get('/actions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const actions = await TaskAction.findAll({
      order: [['name', 'ASC']]
    });
    res.status(200).json({ actions });
  } catch (error) {
    console.error('Error fetching task actions:', error);
    res.status(500).json({ error: 'Failed to fetch task actions' });
  }
});

// Get all tasks (for task list)
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const tasks = await DailyTask.findAll({
      include: [{ 
        model: TaskAction,
        attributes: ['action_id', 'name', 'description', 'tracking_event']
      }],
      order: [['name', 'ASC']]
    });
    res.status(200).json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const task = await DailyTask.create(req.body);
    
    // Fetch the created task with its associated TaskAction
    const taskWithAction = await DailyTask.findOne({
      where: { task_id: task.task_id },
      include: [{ 
        model: TaskAction,
        attributes: ['action_id', 'name', 'description', 'tracking_event']
      }]
    });

    res.status(201).json(taskWithAction);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
router.put('/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const task = await DailyTask.findOne({
      where: { task_id: req.params.taskId }
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    await task.update(req.body);
    
    // Fetch the updated task with its associated TaskAction
    const updatedTaskWithAction = await DailyTask.findOne({
      where: { task_id: task.task_id },
      include: [{ 
        model: TaskAction,
        attributes: ['action_id', 'name', 'description', 'tracking_event']
      }]
    });

    res.status(200).json(updatedTaskWithAction);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
router.delete('/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const task = await DailyTask.findOne({
      where: { task_id: req.params.taskId }
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    await task.destroy();
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get all task sets
router.get('/sets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const sets = await TaskSet.findAll({
      include: [
        {
          model: DailyTask,
          through: {
            attributes: ['display_order']
          },
          include: [{ 
            model: TaskAction,
            attributes: ['action_id', 'name', 'description', 'tracking_event']
          }]
        }
      ],
      order: [['name', 'ASC']]
    });

    res.status(200).json({ sets });
  } catch (error) {
    console.error('Error fetching task sets:', error);
    res.status(500).json({ error: 'Failed to fetch task sets' });
  }
});

module.exports = router;
