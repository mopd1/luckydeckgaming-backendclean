-- For tracking admin actions/audit log
CREATE TABLE IF NOT EXISTS admin_actions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id INT,
    previous_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS game_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    game_type VARCHAR(50) NOT NULL,
    config_key VARCHAR(100) NOT NULL,
    config_value JSON NOT NULL,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id),
    UNIQUE KEY unique_config (game_type, config_key)
);
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL,
    priority ENUM('low', 'medium', 'high') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
cat > routes/adminRoutes.js << 'EOF'
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
