const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
//const googleAuthRoutes = require('./googleAuthRoutes');
const userRoutes = require('./userRoutes');
const gameRoutes = require('./gameRoutes');
const gameSessionRoutes = require('./gameSessionRoutes');
const userGameSessionRoutes = require('./userGameSessionRoutes');
const revenueTransactionRoutes = require('./revenueTransactionRoutes');
const storeTransactionRoutes = require('./storeTransactionRoutes');
const avatarPartRoutes = require('./avatarPartRoutes');
const friendRoutes = require('./friendRoutes');
const dailyTaskRoutes = require('./dailyTaskRoutes');

router.get('/', (req, res) => {
  res.send('API is working');
});
router.use('/auth', authRoutes);
//router.use.*googleAuthRoutes);
router.use('/users', userRoutes);
router.use('/games', gameRoutes);
router.use('/game-sessions', gameSessionRoutes);
router.use('/user-game-sessions', userGameSessionRoutes);
router.use('/revenue-transactions', revenueTransactionRoutes);
router.use('/store-transactions', storeTransactionRoutes);
router.use('/avatar-parts', avatarPartRoutes);
router.use('/friends', friendRoutes);
router.use('/daily-tasks', dailyTaskRoutes);

module.exports = router;

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is healthy' });
});
