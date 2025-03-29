// File: routes/dailyTaskRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const db = require('../models');
const { Op } = require('sequelize');
const { checkSeasonPassProgress } = require('../utils/seasonPassUtils');

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
        // Find the user again to ensure we have the latest instance for increment
        // Although findByPk might return the same instance, increment works directly on the DB.
        const userToReward = await db.User.findByPk(userId);

        if (userToReward) { // Use userToReward instance for incrementing
          console.log(`Task ${task_id} completed by user ${userId}. Applying reward: ${task.reward_amount} ${task.reward_type}.`); // Log reward attempt

          // Apply the reward based on type using ATOMIC INCREMENTS
          try { // Add try-catch around increments for better error logging
            switch (task.reward_type) {
              case 'gems':
                // user.gems += task.reward_amount; // Old way
                await userToReward.increment('gems', { by: task.reward_amount }); // New atomic way
                console.log(`   - Atomically incremented gems by ${task.reward_amount} for user ${userId}.`);
                break;
              case 'chips':
              case 'balance': // Support both terms
                // user.balance += task.reward_amount; // Old way
                await userToReward.increment('balance', { by: task.reward_amount }); // New atomic way
                console.log(`   - Atomically incremented balance by ${task.reward_amount} for user ${userId}.`);
                break;
              case 'action_points':
                // if (!user.action_points) user.action_points = 0; // Old way
                // user.action_points += task.reward_amount; // Old way
                await userToReward.increment('action_points', { by: task.reward_amount }); // New atomic way
                console.log(`   - Atomically incremented action_points by ${task.reward_amount} for user ${userId}.`);

                // Check for season pass progress
                const updatedUser = await db.User.findByPk(userId);
                const newMilestones = await checkSeasonPassProgress(userId, updatedUser.action_points);
                if (newMilestones.length > 0) {
                  console.log(`   - User ${userId} unlocked ${newMilestones.length} season pass milestones`);
                }
                break;

              default:
                console.log(`   - Unknown reward_type: ${task.reward_type}. No reward applied.`);
              }

            // Mark reward as claimed ONLY IF increment succeeded
            userProgress.reward_claimed = true;
            console.log(`   - Marked reward as claimed for task ${task_id}, user ${userId}.`);

          } catch(incrementError) {
              console.error(`   - FAILED to apply reward increment for user ${userId}, task ${task_id}:`, incrementError);
              // Decide if you still want to mark reward_claimed = false here or handle differently
              // For now, we won't mark it claimed if the increment fails.
          }

        } else {
           console.error(`   - Could not find user ${userId} to apply reward for task ${task_id}.`);
           // Handle case where user somehow doesn't exist when trying to reward
        }
      } // end if (isNewlyCompleted)

      // Save progress (this saves completed status and reward_claimed status)
      await userProgress.save();
      console.log(` - Saved UserTaskProgress for task ${task_id}, user ${userId}.`);

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

// Task Set management endpoints
router.post('/sets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskSet = await db.TaskSet.create(req.body);
    res.status(201).json(taskSet);
  } catch (error) {
    console.error('Error creating task set:', error);
    res.status(500).json({ error: 'Failed to create task set' });
  }
});

router.put('/sets/:setId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskSet = await db.TaskSet.findOne({
      where: { set_id: req.params.setId }
    });

    if (!taskSet) {
      return res.status(404).json({ error: 'Task set not found' });
    }

    await taskSet.update(req.body);
    res.status(200).json(taskSet);
  } catch (error) {
    console.error('Error updating task set:', error);
    res.status(500).json({ error: 'Failed to update task set' });
  }
});

// Get tasks in a set
router.get('/sets/:setId/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const taskSet = await db.TaskSet.findOne({
      where: { set_id: req.params.setId },
      include: [{
        model: db.DailyTask,
        through: {
          attributes: ['display_order']
        }
      }]
    });

    if (!taskSet) {
      return res.status(404).json({ error: 'Task set not found' });
    }

    // Format tasks with display order
    const tasks = taskSet.DailyTasks.map(task => ({
      ...task.toJSON(),
      display_order: task.TaskSetTasks.display_order
    }));

    res.status(200).json({ tasks });
  } catch (error) {
    console.error('Error getting tasks in set:', error);
    res.status(500).json({ error: 'Failed to get tasks in set' });
  }
});

// Simple direct endpoint to add a task to a set (admin only)
router.get('/add-task-to-set/:setId/:taskId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { setId, taskId } = req.params;

    // Check if user is an admin
    const user = await db.User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Find the task
    const task = await db.DailyTask.findOne({
      where: { task_id: taskId }
    });

    if (!task) {
      return res.status(404).json({ error: `Task ${taskId} not found` });
    }

// Find the set
   const set = await db.TaskSet.findOne({
     where: { set_id: setId }
   });

   if (!set) {
     return res.status(404).json({ error: `Task set ${setId} not found` });
   }

   // Check if task is already in set
   const existing = await db.TaskSetTasks.findOne({
     where: {
       set_id: set.id, // Use the set's database ID
       task_id: task.id // Use the task's database ID
     }
   });

   if (existing) {
     return res.status(200).json({ message: `Task ${taskId} is already in set ${setId}` });
   }

   // Add task to set
   await db.TaskSetTasks.create({
     set_id: set.set_id, // Use the set's database ID
     task_id: task.task_id, // Use the task's database ID
     display_order: 0
   });

   res.status(200).json({
     success: true,
     message: `Added task ${taskId} to set ${setId}`
   });
 } catch (error) {
   console.error('Error adding task to set:', error);
   res.status(500).json({
     error: 'Failed to add task to set',
     details: error.message
   });
 }
});

// Debug task-to-set relationship
router.get('/debug/task/:taskId', authenticateToken, async (req, res) => {
 try {
   const userId = req.user.id;
   const { taskId } = req.params;
   
   // Check if user is an admin
   const user = await db.User.findByPk(userId);
   if (!user || !user.is_admin) {
     return res.status(403).json({ error: 'Unauthorized' });
   }
   
   // Find the task
   const task = await db.DailyTask.findOne({
     where: { task_id: taskId }
   });
   
   if (!task) {
     return res.status(404).json({ error: `Task ${taskId} not found` });
   }
   
   res.status(200).json({
     task_id: task.task_id,
     record_id: task.id,
     name: task.name,
     description: task.description
   });
 } catch (error) {
   console.error('Error:', error);
   res.status(500).json({ error: error.message });
 }
});

// Update task order in a set
router.put('/sets/:setId/tasks/:taskId', authenticateToken, async (req, res) => {
 try {
   const userId = req.user.id;
   const user = await db.User.findByPk(userId);
   if (!user || !user.is_admin) {
     return res.status(403).json({ error: 'Unauthorized' });
   }

   const { setId, taskId } = req.params;
   const { display_order } = req.body;

   // Find set
   const set = await db.TaskSet.findOne({
     where: { set_id: setId }
   });

   if (!set) {
     return res.status(404).json({ error: 'Task set not found' });
   }

   // Find task
   const task = await db.DailyTask.findOne({
     where: { task_id: taskId }
   });

   if (!task) {
     return res.status(404).json({ error: 'Task not found' });
   }

   // Find the association
   const setTask = await db.TaskSetTasks.findOne({
     where: {
       set_id: set.set_id,
       task_id: task.task_id
     }
   });

   if (!setTask) {
     return res.status(404).json({ error: 'Task not found in this set' });
   }

   // Update display order
   await setTask.update({ display_order });

   res.status(200).json({ message: 'Task order updated' });
 } catch (error) {
   console.error('Error updating task order:', error);
   res.status(500).json({ error: 'Failed to update task order' });
 }
});

// Remove task from a set
router.delete('/sets/:setId/tasks/:taskId', authenticateToken, async (req, res) => {
 try {
   const userId = req.user.id;
   const user = await db.User.findByPk(userId);
   if (!user || !user.is_admin) {
     return res.status(403).json({ error: 'Unauthorized' });
   }

   const { setId, taskId } = req.params;

   // Find set
   const set = await db.TaskSet.findOne({
     where: { set_id: setId }
   });

   if (!set) {
     return res.status(404).json({ error: 'Task set not found' });
   }

   // Find task
   const task = await db.DailyTask.findOne({
     where: { task_id: taskId }
   });

   if (!task) {
     return res.status(404).json({ error: 'Task not found' });
   }

   // Delete the association
   const result = await db.TaskSetTasks.destroy({
     where: {
       set_id: set.set_id,
       task_id: task.task_id
     }
   });

   if (result === 0) {
     return res.status(404).json({ error: 'Task not found in this set' });
   }

   res.status(200).json({ message: 'Task removed from set' });
 } catch (error) {
   console.error('Error removing task from set:', error);
   res.status(500).json({ error: 'Failed to remove task from set' });
 }
});

// Add task to a set
router.post('/sets/:setId/tasks', authenticateToken, async (req, res) => {
 try {
   const userId = req.user.id;
   const { setId } = req.params;
   const { task_id, display_order = 0 } = req.body;

   // Check if user is admin
   const user = await db.User.findByPk(userId);
   if (!user || !user.is_admin) {
     return res.status(403).json({ error: 'Unauthorized' });
   }

   // Find the task
   const task = await db.DailyTask.findOne({
     where: { task_id }
   });

   if (!task) {
     return res.status(404).json({ error: 'Task not found' });
   }

   // Find the set
   const set = await db.TaskSet.findOne({
     where: { set_id: setId }
   });

   if (!set) {
     return res.status(404).json({ error: 'Task set not found' });
   }

   // Check if the task is already in the set
   const existingTask = await db.TaskSetTasks.findOne({
     where: {
       set_id: set.id,
       task_id: task.id
     }
   });

   if (existingTask) {
     // If it already exists, just update the display order
     existingTask.display_order = display_order;
     await existingTask.save();
     return res.status(200).json({ 
       message: 'Task display order updated in set',
       taskSet: existingTask
     });
   }

   // Add the task to the set
   const taskSet = await db.TaskSetTasks.create({
     set_id: set.set_id,
     task_id: task.task_id,
     display_order
   });

   res.status(201).json({
     message: 'Task added to set',
     taskSet
   });
 } catch (error) {
   console.error('Error adding task to set:', error);
   res.status(500).json({ error: 'Failed to add task to set' });
 }
});

// Get calendar entries for a specific month (admin only)
router.get('/calendar/:year/:month', authenticateToken, async (req, res) => {
 try {
   const userId = req.user.id;
   const { year, month } = req.params;

   // Check if user is an admin
   const user = await db.User.findByPk(userId);
   if (!user || !user.is_admin) {
     return res.status(403).json({ error: 'Unauthorized' });
   }

   // Calculate start and end dates for the month
   const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
   const endDate = new Date(parseInt(year), parseInt(month), 0);

   const startDateStr = startDate.toISOString().split('T')[0];
   const endDateStr = endDate.toISOString().split('T')[0];

   // Find all calendar entries for the month
   const entries = await db.TaskCalendar.findAll({
     where: {
       date: {
         [Op.between]: [startDateStr, endDateStr]
       }
     },
     include: [
       {
         model: db.TaskSet,
         attributes: ['name']
       }
     ]
   });

   // Format the response as a date-indexed object
   const calendarData = {};
   entries.forEach(entry => {
     calendarData[entry.date] = {
       id: entry.id,
       set_id: entry.set_id,
       set_name: entry.TaskSet ? entry.TaskSet.name : 'Unknown Set'
     };
   });

   res.status(200).json({ calendar: calendarData });
 } catch (error) {
   console.error('Error fetching calendar for month:', error);
   res.status(500).json({ error: 'Failed to fetch calendar data' });
 }
});

// Assign a task set to multiple dates (admin only)
router.post('/calendar/set-dates', authenticateToken, async (req, res) => {
 try {
   const userId = req.user.id;
   const { setId, dates } = req.body;

   // Check if user is an admin
   const user = await db.User.findByPk(userId);
   if (!user || !user.is_admin) {
     return res.status(403).json({ error: 'Unauthorized' });
   }

   if (!setId || !dates || !Array.isArray(dates) || dates.length === 0) {
     return res.status(400).json({ error: 'Set ID and dates array are required' });
   }

   // Check if task set exists
   const taskSet = await db.TaskSet.findOne({
     where: { set_id: setId }
   });

   if (!taskSet) {
     return res.status(404).json({ error: 'Task set not found' });
   }

   // Update or create calendar entries for each date
   const results = await Promise.all(
     dates.map(async (date) => {
       const [entry, created] = await db.TaskCalendar.findOrCreate({
         where: { date },
         defaults: { set_id: setId }
       });

       if (!created) {
         entry.set_id = setId;
         await entry.save();
       }

       return { date, created };
     })
   );

   res.status(200).json({
     message: 'Calendar updated successfully',
     results
   });
 } catch (error) {
   console.error('Error updating calendar dates:', error);
   res.status(500).json({ error: 'Failed to update calendar dates' });
 }
});

// Create a new calendar entry (admin only)
router.post('/calendar', authenticateToken, async (req, res) => {
 try {
   const userId = req.user.id;

   // Check if user is an admin
   const user = await db.User.findByPk(userId);
   if (!user || !user.is_admin) {
     return res.status(403).json({ error: 'Unauthorized' });
   }

   const { date, set_id } = req.body;

   if (!date || !set_id) {
     return res.status(400).json({ error: 'Date and set_id are required' });
   }

   // Check if task set exists
   const taskSet = await db.TaskSet.findOne({
     where: { set_id: set_id }
   });

   if (!taskSet) {
     return res.status(404).json({ error: 'Task set not found' });
   }

   // Create or update calendar entry
   const [calendarEntry, created] = await db.TaskCalendar.findOrCreate({
     where: { date: date },
     defaults: { set_id: set_id }
   });

   if (!created) {
     // Update existing entry
     calendarEntry.set_id = set_id;
     await calendarEntry.save();
   }

   res.status(201).json({
     message: created ? 'Calendar entry created' : 'Calendar entry updated',
     calendar_entry: calendarEntry
   });
 } catch (error) {
   console.error('Error creating calendar entry:', error);
   res.status(500).json({ error: 'Failed to create calendar entry' });
 }
});

// Update a calendar entry (admin only)
router.put('/calendar/:id', authenticateToken, async (req, res) => {
 try {
   const userId = req.user.id;
   const entryId = req.params.id;
   const { set_id } = req.body;

   // Check if user is an admin
   const user = await db.User.findByPk(userId);
   if (!user || !user.is_admin) {
     return res.status(403).json({ error: 'Unauthorized' });
   }

   if (!set_id) {
     return res.status(400).json({ error: 'set_id is required' });
   }

   // Check if task set exists
   const taskSet = await db.TaskSet.findOne({
     where: { set_id: set_id }
   });

   if (!taskSet) {
     return res.status(404).json({ error: 'Task set not found' });
   }

   // Find and update calendar entry
   const calendarEntry = await db.TaskCalendar.findByPk(entryId);
   if (!calendarEntry) {
     return res.status(404).json({ error: 'Calendar entry not found' });
   }

   calendarEntry.set_id = set_id;
   await calendarEntry.save();

   res.status(200).json({
     message: 'Calendar entry updated',
     calendar_entry: calendarEntry
   });
 } catch (error) {
   console.error('Error updating calendar entry:', error);
   res.status(500).json({ error: 'Failed to update calendar entry' });
 }
});

// Delete a calendar entry (admin only)
router.delete('/calendar/:id', authenticateToken, async (req, res) => {
 try {
   const userId = req.user.id;
   const entryId = req.params.id;

   // Check if user is an admin
   const user = await db.User.findByPk(userId);
   if (!user || !user.is_admin) {
     return res.status(403).json({ error: 'Unauthorized' });
   }

   // Find and delete calendar entry
   const calendarEntry = await db.TaskCalendar.findByPk(entryId);
   if (!calendarEntry) {
     return res.status(404).json({ error: 'Calendar entry not found' });
   }

   await calendarEntry.destroy();

   res.status(200).json({
     message: 'Calendar entry deleted'
   });
 } catch (error) {
   console.error('Error deleting calendar entry:', error);
   res.status(500).json({ error: 'Failed to delete calendar entry' });
 }
});

// Add task management routes (admin only)
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Check if user is admin
    const user = await db.User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const tasks = await db.DailyTask.findAll({
      include: [{ model: db.TaskAction }]
    });
    res.status(200).json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task (admin only)
router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Check if user is admin
    const user = await db.User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const task = await db.DailyTask.create(req.body);
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task (admin only)
router.put('/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Check if user is admin
    const user = await db.User.findByPk(userId);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const task = await db.DailyTask.findOne({
      where: { task_id: req.params.taskId }
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    await task.update(req.body);
    res.status(200).json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

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
