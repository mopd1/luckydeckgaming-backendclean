require('dotenv').config();

if (process.env.NODE_ENV !== 'production') {
    console.log('JWT_SECRET is set:', !!process.env.JWT_SECRET);
    console.log('JWT_REFRESH_SECRET is set:', !!process.env.JWT_REFRESH_SECRET);
}

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { corsOptions } = require('./config/cors');
const app = express();
const http = require('http');
const server = http.createServer(app);
const PokerWebSocketServer = require('./src/websocket/PokerWebSocketServer');
const helmet = require('helmet');
const port = process.env.PORT || 8081;
const passport = require('passport');
const assetsRouter = require('./routes/assets');
const dailyTaskRoutes = require('./routes/dailyTaskRoutes');
const seasonPassRoutes = require('./routes/seasonPassRoutes');
const { scheduleSeasonCreation } = require('./utils/seasonAutoCreation');
const packageRoutes = require('./routes/packageRoutes');
const crmRoutes = require('./routes/crmRoutes');
//const avatarCompositeRoutes = require('./routes/avatarCompositeRoutes');
const leaderboardRoutes = require('./routes/leaderboards');
const { scheduleDailyLeaderboardReset } = require('./services/leaderboardService');
const { redisClient } = require('./services/redisClient');

// Trust nginx proxy
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', true);
} else {
    app.set('trust proxy', false);
}

// Body parsing middleware must come first
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
    const isWebSocketRequest = req.headers.upgrade === 'websocket' || 
                               req.headers.connection?.toLowerCase().includes('upgrade');
    
    if (isWebSocketRequest) {
        console.log('🔄 NEW WEBSOCKET UPGRADE REQUEST DETECTED:');
        console.log('--- WebSocket Request Details ---');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Method:', req.method);
        console.log('URL:', req.originalUrl);
        console.log('Query:', req.query);
        console.log('Upgrade Header:', req.headers.upgrade);
        console.log('Connection Header:', req.headers.connection);
        console.log('WebSocket Key:', req.headers['sec-websocket-key']);
        console.log('WebSocket Version:', req.headers['sec-websocket-version']);
        console.log('Origin:', req.headers.origin);
        console.log('User-Agent:', req.headers['user-agent']);
        console.log('IP:', req.ip);
        console.log('All Headers:', JSON.stringify(req.headers, null, 2));
        console.log('--------------------------------');
    }
    next();
});

// Enhanced WebSocket debugging middleware
app.use((req, res, next) => {
    const isWebSocketRequest = req.headers.upgrade === 'websocket' || 
                               req.headers.connection?.toLowerCase().includes('upgrade');
    
    if (isWebSocketRequest) {
        console.log('🔄 WEBSOCKET UPGRADE REQUEST DETECTED:');
        console.log('--- WebSocket Request Details ---');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Method:', req.method);
        console.log('URL:', req.originalUrl);
        console.log('Upgrade Header:', req.headers.upgrade);
        console.log('Connection Header:', req.headers.connection);
        console.log('WebSocket Key:', req.headers['sec-websocket-key']);
        console.log('WebSocket Version:', req.headers['sec-websocket-version']);
        console.log('Origin:', req.headers.origin);
        console.log('All Headers:', JSON.stringify(req.headers, null, 2));
        console.log('IP:', req.ip);
        console.log('--------------------------------');
    } else {
        // Regular request logging (condensed for non-WebSocket requests)
        console.log('Incoming request:', {
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.get('user-agent'),
            correlationId: req.headers['x-correlation-id'] || Date.now().toString()
        });
    }
    next();
});

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Initialize WebSocket after middleware
console.log('🚀 Starting PokerWebSocketServer initialization...');

let wss;
try {
    console.log('📦 Loading PokerWebSocketServer module...');
    const PokerWebSocketServer = require('./src/websocket/PokerWebSocketServer');
    console.log('✅ PokerWebSocketServer module loaded successfully');
    
    console.log('🔌 Creating PokerWebSocketServer instance...');
    wss = new PokerWebSocketServer(server);
    console.log('✅ PokerWebSocketServer instance created successfully');
    
    console.log('🎮 PokerWebSocketServer fully initialized and ready');
} catch (error) {
    console.error('❌ CRITICAL ERROR: PokerWebSocketServer failed to initialize:', error);
    console.error('📍 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
    });
    
    // Fallback to basic WebSocket for debugging
    console.log('🔄 Falling back to basic WebSocket server...');
    try {
        const WebSocket = require('ws');
        wss = new WebSocket.Server({ 
            server: server,
            verifyClient: (info) => {
                console.log('🔍 WebSocket connection attempt from:', info.origin);
                return true; // Accept all connections for testing
            }
        });
        
        wss.on('connection', (ws, request) => {
            console.log('✅ Basic WebSocket connection established');
            
            ws.on('message', (message) => {
                console.log('📨 Received message:', message.toString());
                ws.send(JSON.stringify({ 
                    type: 'echo', 
                    message: 'Hello from fallback WebSocket!',
                    received: message.toString(),
                    timestamp: new Date().toISOString()
                }));
            });
            
            // Send welcome message
            ws.send(JSON.stringify({ 
                type: 'welcome', 
                message: 'Fallback WebSocket connected successfully!',
                timestamp: new Date().toISOString()
            }));
        });
        
        console.log('✅ Fallback WebSocket server started successfully');
    } catch (fallbackError) {
        console.error('❌ FATAL: Even fallback WebSocket failed:', fallbackError);
        throw fallbackError;
    }
}

// Import models and initialize passport
const { User } = require('./models');
const initializePassport = require('./config/passport');
const configuredPassport = initializePassport(User);
app.use(configuredPassport.initialize());

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// URL decoding protection
app.use((req, res, next) => {
    try {
        decodeURIComponent(req.path);
        next();
    } catch (err) {
        res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid URL encoding'
        });
    }
});

// Rate limiting configuration
const rateLimit = require('express-rate-limit');

// Set extremely high limits effectively disabling rate limiting for testing
const defaultLimiter = rateLimit({
    windowMs: 1 * 1000, // 1 second
    max: 10000,         // Very high limit
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: 1 * 1000, // 1 second
    max: 10000,         // Very high limit
    standardHeaders: true,
    legacyHeaders: false
});

const gameDataLimiter = rateLimit({
    windowMs: 1 * 1000, // 1 second
    max: 10000,         // Very high limit
    standardHeaders: true,
    legacyHeaders: false
});

const userDataLimiter = rateLimit({
    windowMs: 1 * 1000, // 1 second
    max: 10000,         // Very high limit
    standardHeaders: true,
    legacyHeaders: false
});

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const avatarPartRoutes = require('./routes/avatarPartRoutes');
const gameRoutes = require('./routes/gameRoutes');
const pokerRoutes = require('./routes/poker');
const blackjackRoutes = require('./routes/blackjack');
const gameSessionRoutes = require('./routes/gameSessionRoutes');
const revenueTransactionRoutes = require('./routes/revenueTransactionRoutes');
const storeTransactionRoutes = require('./routes/storeTransactionRoutes');
const userGameSessionRoutes = require('./routes/userGameSessionRoutes');
const userRoutes = require('./routes/userRoutes');
const indexRoutes = require('./routes/index');
const storeRoutes = require('./routes/storeRoutes');
const friendRoutes = require('./routes/friendRoutes');
const playerGradingRoutes = require('./routes/playerGradingRoutes');

// Debug route to verify API is working
app.get('/api/test', defaultLimiter, (req, res) => {
    res.json({ message: 'API is working' });
});

// Health check endpoint - no rate limit
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Add an additional health check endpoint at /api/health for Elastic Beanstalk
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/test-redis', async (req, res) => {
    try {
        const testKey = `test_${Date.now()}`;
        await redisClient.setex(testKey, 60, 'test_value');
        const value = await redisClient.get(testKey);
        await redisClient.del(testKey); // Clean up
        
        res.json({ 
            success: true, 
            redis_working: value === 'test_value',
            message: 'Redis connection is working',
            redis_host: process.env.REDIS_HOST || 'not_set',
            redis_port: process.env.REDIS_PORT || 'not_set',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            redis_host: process.env.REDIS_HOST || 'not_set',
            redis_port: process.env.REDIS_PORT || 'not_set',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    }
});

// Routes without rate limiting
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetsRouter);
//app.use.*avatarCompositeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/poker', pokerRoutes);
app.use('/api/blackjack', blackjackRoutes);
app.use('/api/game-sessions', gameSessionRoutes);
app.use('/api/user-game-sessions', userGameSessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/avatar-parts', avatarPartRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/revenue-transactions', revenueTransactionRoutes);
app.use('/api/store-transactions', storeTransactionRoutes);
app.use('/api/balance', require('./routes/balanceRoutes'));
app.use('/api/daily-tasks', dailyTaskRoutes);
app.use('/api/player-grading', playerGradingRoutes);
console.log("!!! --- Mounting /api/season-pass with router: --- !!!", typeof seasonPassRoutes);
app.use('/api/season-pass', seasonPassRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/leaderboards', leaderboardRoutes);

// Default routes without rate limiting
app.use('/api', indexRoutes);

// Root health check endpoint for Elastic Beanstalk
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        service: 'Lucky Deck Gaming API',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Error handling for CORS errors
app.use((err, req, res, next) => {
    if (err.message === 'Origin not allowed by CORS') {
        console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'cors_error',
            error: err.message,
            origin: req.headers.origin,
            method: req.method,
            url: req.url
        }));
        return res.status(403).json({
            error: 'CORS not allowed',
            message: 'Origin not allowed by CORS policy'
        });
    }
    next(err);
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    // Log error details
    console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'error',
        error: {
            name: err.name,
            message: err.message,
            stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
        },
        request: {
            url: req.url,
            method: req.method,
            correlationId: req.headers['x-correlation-id'] || 'none'
        }
    }));

    // Handle specific error types
    if (err instanceof URIError) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Malformed URL'
        });
    }

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid JSON'
        });
    }

    // Production vs development error responses
    if (process.env.NODE_ENV === 'production') {
        res.status(err.status || 500).json({
            error: 'Internal Server Error'
        });
    } else {
        res.status(err.status || 500).json({
            error: err.name || 'Internal Server Error',
            message: err.message,
            stack: err.stack
        });
    }
});

// 404 handler - must be last
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource does not exist'
    });
});

// Start server using 'server.listen'
server.listen(port, '0.0.0.0', () => {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'server_start',
        protocol: protocol,
        port: port,
        environment: process.env.NODE_ENV || 'development'
    }));
});

// Schedule the season creation job if in production
if (process.env.NODE_ENV === 'production') {
  scheduleSeasonCreation();
}

// Start the scheduled tasks after initializing the server
//app.listen(PORT, () => {
  //console.log(`Server running on port ${port}`);
  //scheduleDailyLeaderboardReset();
//});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'shutdown_initiated',
        signal: 'SIGTERM'
    }));
    server.close(() => {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'server_shutdown',
            signal: 'SIGTERM'
        }));
        process.exit(0);
    });
});

module.exports = { app, server, wss };
