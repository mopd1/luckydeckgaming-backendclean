const express = require('express');
const router = express.Router();
const { validateAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');
const gameConfigController = require('../controllers/gameConfigController');
const ticketController = require('../controllers/ticketController');
const analyticsController = require('../controllers/analyticsController');

// Apply admin authentication middleware to all routes
router.use(validateAdmin);

// User Management
router.get('/users/search', userController.searchUsers);
router.get('/users/:id', userController.getUserDetails);
router.put('/users/:id/balance', userController.adjustUserBalance);
router.put('/users/:id/status', userController.updateUserStatus);

// Game Configuration
router.get('/game-config/:gameType', gameConfigController.getConfig);
router.put('/game-config/:gameType', gameConfigController.updateConfig);

// Support Tickets
router.get('/support-tickets', ticketController.listTickets);
router.get('/support-tickets/:id', ticketController.getTicketDetails);
router.put('/support-tickets/:id', ticketController.updateTicket);

// Analytics
router.get('/analytics/revenue', analyticsController.getRevenue);
router.get('/analytics/active-users', analyticsController.getActiveUsers);
router.get('/analytics/chip-economy', analyticsController.getChipEconomy);

module.exports = router;
