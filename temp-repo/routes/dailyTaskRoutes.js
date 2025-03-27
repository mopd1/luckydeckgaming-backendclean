// File: routes/dailyTaskRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../models');
const { Op } = require('sequelize');

// Get the current daily tasks for the user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("Getting daily tasks for user ID:", userId);

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    console.log("Today's date:", today);

    // Get the next reset time (00:00 CET / 23:00 UTC)
    const now = new Date();
    const resetHour = 23; // 00:00 CET = 23:00 UTC

    let resetTime = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      resetHour, 0, 0, 0
    ));

    // If current time is after today's reset, set to tomorrow's reset
    if (now.getUTCHours() >= resetHour) {
      resetTime.setUTCDate(resetTime.getUTCDate() + 1);
    }
    console.log("Next reset time:", resetTime);

    // Format the response with default values
    const response = {
      set_name: "Default Daily Tasks",
      tasks: {},
      progress: {},
      reset_time: Math.floor(resetTime.getTime() / 1000) // Unix timestamp
    };

    // Default tasks in case we need them
    const defaultTasks = {
      "task1": {
        name: "Poker Pro",
        description: "Play 10 hands of NL Holdem Cash Games",
        required_repetitions: 10,
        reward_type: "gems",
        reward_amount: 1000
      },
      "task2": {
        name: "Blackjack Master",
        description: "Win 10 hands of Blackjack",
        required_repetitions: 10,
        reward_type: "gems",
        reward_amount: 500
      }
    };

    try {
      // Find today's task set from calendar
      let taskSetId = 'default'; // Default fallback
      const calendarEntry = await db.TaskCalendar.findOne({
        where: { date: today }
      });

      if (calendarEntry) {
        taskSetId = calendarEntry.set_id;
        console.log("Found task set ID from calendar:", taskSetId);
      } else {
        console.log("No calendar entry found, creating one with default task set");
        await db.TaskCalendar.create({
          date: today,
          set_id: 'default'
        });
      }

      // Get all tasks directly
      const tasks = await db.DailyTask.findAll({
        include: [
          {
            model: db.TaskAction
          },
          {
            model: db.TaskSet,
            where: { set_id: taskSetId },
            through: {
              attributes: ['display_order']
            }
          }
        ],
        order: [[db.TaskSet, db.TaskSetTasks, 'display_order', 'ASC']]
      });

      console.log(`Found ${tasks.length} tasks for set ID ${taskSetId}`);

      if (tasks && tasks.length > 0) {
        // Add tasks to response
        tasks.forEach(task => {
          response.tasks[task.task_id] = {
            name: task.name,
            description: task.description,
            required_repetitions: task.required_repetitions,
            reward_type: task.reward_type,
            reward_amount: task.reward_amount
          };

          // Add action data if available
          if (task.TaskAction) {
            response.tasks[task.task_id].action = {
              id: task.TaskAction.action_id,
              name: task.TaskAction.name,
              tracking_event: task.TaskAction.tracking_event
            };
          }
        });
      } else {
        console.log("No tasks found, using default tasks");
        // Use default tasks if none found
        response.tasks = defaultTasks;
      }
    } catch (error) {
      console.error("Error retrieving tasks from database:", error);
      // Use default tasks if error occurred
      response.tasks = defaultTasks;
    }

    // If we still have no tasks, use defaults
    if (Object.keys(response.tasks).length === 0) {
      console.log("No tasks found after all attempts, using default tasks");
      response.tasks = defaultTasks;
    }

    try {
      // Get user's progress for these tasks for today
      const userProgress = await db.UserTaskProgress.findAll({
        where: {
          user_id: userId,
          task_id: Object.keys(response.tasks),
          tracking_date: today
        }
      });

      console.log(`Found ${userProgress.length} progress records for user ${userId}`);

      // Initialize progress for all tasks
      for (const taskId in response.tasks) {
        response.progress[taskId] = {
          current_repetitions: 0,
          completed: false,
          reward_claimed: false
        };
      }

      // Update with any existing progress
      userProgress.forEach(progress => {
        response.progress[progress.task_id] = {
          current_repetitions: progress.current_repetitions,
          completed: progress.completed,
          reward_claimed: progress.reward_claimed
        };
      });

      // Check if there was a reset that should have happened
      // (if the user is visiting after midnight but hasn't reset yet)
      const lastReset = await db.UserDailyReset.findOne({
        where: { user_id: userId },
        order: [['reset_date', 'DESC']]
      });

      const shouldReset = !lastReset || lastReset.reset_date < today;
      
      // For tasks where we don't have progress records yet
      for (const taskId in response.tasks) {
        const existingProgress = userProgress.find(p => p.task_id === taskId);
        
        if (!existingProgress) {
          console.log(`Creating progress record for task ${taskId}`);
          await db.UserTaskProgress.create({
            user_id: userId,
            task_id: taskId,
            current_repetitions: 0,
            completed: false,
            reward_claimed: false,
            reset_at: resetTime,
            tracking_date: today
          });
        } 
        // If we should reset but haven't yet, update the record
        else if (shouldReset) {
          console.log(`Resetting progress for task ${taskId} - new day`);
          existingProgress.current_repetitions = 0;
          existingProgress.completed = false;
          existingProgress.reward_claimed = false;
          existingProgress.tracking_date = today;
          existingProgress.reset_at = resetTime;
          await existingProgress.save();
          
          // Update the response to show reset progress
          response.progress[taskId] = {
            current_repetitions: 0,
            completed: false,
            reward_claimed: false
          };
        }
      }
      
      // Record this reset
      if (shouldReset) {
        await db.UserDailyReset.create({
          user_id: userId,
          reset_date: today
        });
      }
    } catch (error) {
      console.error("Error handling user progress:", error);
      // Initialize progress with defaults if error occurred
      for (const taskId in response.tasks) {
        response.progress[taskId] = {
          current_repetitions: 0,
          completed: false,
          reward_claimed: false
        };
      }
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching daily tasks:', error);
    res.status(500).json({ error: 'Failed to fetch daily tasks' });
  }
});

// Update task progress
router.put('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { task_id, increment = 1 } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: 'Task ID is required' });
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Get the task details
    const task = await db.DailyTask.findOne({
      where: { task_id: task_id, is_active: true }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get the next reset time (00:00 CET / 23:00 UTC)
    const now = new Date();
    const resetHour = 23; // 00:00 CET = 23:00 UTC

    let resetTime = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      resetHour, 0, 0, 0
    ));

    // If current time is after today's reset, set to tomorrow's reset
    if (now.getUTCHours() >= resetHour) {
      resetTime.setUTCDate(resetTime.getUTCDate() + 1);
    }

    // Find or create progress record for today
    let [userProgress, created] = await db.UserTaskProgress.findOrCreate({
      where: {
        user_id: userId,
        task_id: task_id,
        tracking_date: today
      },
      defaults: {
        current_repetitions: 0,
        completed: false,
        reward_claimed: false,
        reset_at: resetTime,
        tracking_date: today
      }
    });

    // Only update if not completed
    if (!userProgress.completed) {
      // Calculate new progress, capped at required repetitions
      const newRepetitions = Math.min(
        userProgress.current_repetitions + increment,
        task.required_repetitions
      );

      // Check if task is newly completed
      const isNewlyCompleted =
        newRepetitions >= task.required_repetitions &&
        userProgress.current_repetitions < task.required_repetitions;

      // Update progress
      userProgress.current_repetitions = newRepetitions;

      // Mark as completed if requirements met
      if (isNewlyCompleted) {
        userProgress.completed = true;

        // Auto-award the reward
        const user = await db.User.findByPk(userId);

        if (user) {
          // Apply the reward based on type
          switch (task.reward_type) {
            case 'gems':
              user.gems += task.reward_amount;
              break;
            case 'chips':
            case 'balance': // Support both terms
              user.balance += task.reward_amount;
              break;
          }

          // Save the user with updated rewards
          await user.save();

          // Mark reward as claimed
          userProgress.reward_claimed = true;
        }
      }

      // Save progress
      await userProgress.save();

      res.status(200).json({
        task_id: task_id,
        current_repetitions: userProgress.current_repetitions,
        completed: userProgress.completed,
        reward_claimed: userProgress.reward_claimed,
        isNewlyCompleted: isNewlyCompleted,
        reward_type: isNewlyCompleted ? task.reward_type : null,
        reward_amount: isNewlyCompleted ? task.reward_amount : null
      });
    } else {
      // Task already completed
      res.status(200).json({
        task_id: task_id,
        current_repetitions: userProgress.current_repetitions,
        completed: true,
        reward_claimed: userProgress.reward_claimed
      });
    }
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(500).json({ error: 'Failed to update task progress' });
  }
});

// Admin endpoints for task management

// Get all task actions (admin only)
router.get('/actions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is an admin
    const user = await db.User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const actions = await db.TaskAction.findAll();
    res.status(200).json({ actions });
  } catch (error) {
    console.error('Error fetching task actions:', error);
    res.status(500).json({ error: 'Failed to fetch task actions' });
  }
});

// Get all task sets (admin only)
router.get('/sets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is an admin
    const user = await db.User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const sets = await db.TaskSet.findAll({
      include: [
        {
          model: db.DailyTask,
          through: {
            attributes: ['display_order']
          }
        }
      ]
    });

    res.status(200).json({ sets });
  } catch (error) {
    console.error('Error fetching task sets:', error);
    res.status(500).json({ error: 'Failed to fetch task sets' });
  }
});

// Get calendar entries (admin only)
router.get('/calendar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user is an admin
    const user = await db.User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { startDate, endDate } = req.query;
    const where = {};

    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.date = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      where.date = {
        [Op.lte]: endDate
      };
    }

    const calendar = await db.TaskCalendar.findAll({
      where,
      include: [
        {
          model: db.TaskSet
        }
      ],
      order: [['date', 'ASC']]
    });

    res.status(200).json({ calendar });
  } catch (error) {
    console.error('Error fetching task calendar:', error);
    res.status(500).json({ error: 'Failed to fetch task calendar' });
  }
});

module.exports = router;
