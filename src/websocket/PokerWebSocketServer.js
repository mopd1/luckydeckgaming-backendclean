// src/websocket/PokerWebSocketServer.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const { MessageTypes } = require('./messageTypes');
const { redisClient } = require('../../services/redisClient');
const PokerGameEngine = require('../poker/PokerGameEngine');

class PokerWebSocketServer {
    constructor(httpServer) {
        this.gameEngines = new Map(); // tableId -> PokerGameEngine
        this.clients = new Map(); // ws -> client info
        
        const wsConfig = {
            server: httpServer,
            clientTracking: true,
            verifyClient: (info, callback) => {
                const token = this.extractToken(info.req);
                if (!token) {
                    callback(false, 4001, 'No authentication token provided');
                    return;
                }
                try {
                    jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
                    callback(true);
                } catch (error) {
                    callback(false, 4001, 'Invalid authentication token');
                }
            },
            pingInterval: 30000,
            pingTimeout: 5000
        };

        this.wss = new WebSocket.Server(wsConfig);
        this.setupServerEvents();
        
        // Redis pub/sub for cross-instance communication
        this.setupRedisSubscriptions();
        
        logger.info(`Poker WebSocket server initialized`);
    }

    async setupRedisSubscriptions() {
        try {
            this.subscriber = redisClient.duplicate();
            await this.subscriber.subscribe('poker:table_events');
            
            this.subscriber.on('message', async (channel, message) => {
                if (channel === 'poker:table_events') {
                    const event = JSON.parse(message);
                    await this.handleRedisEvent(event);
                }
            });
            
            console.log('Redis pub/sub setup complete');
        } catch (error) {
            console.error('Error setting up Redis subscriptions:', error);
        }
    }

    async handleRedisEvent(event) {
        const { tableId, type, data, excludeInstanceId } = event;
        
        // Skip if this event came from this instance
        if (excludeInstanceId === process.env.INSTANCE_ID) {
            return;
        }
        
        // Broadcast to local clients in this table
        await this.broadcastToLocalTable(tableId, {
            type: MessageTypes.SERVER.GAME_STATE,
            data: { event: type, ...data }
        });
    }

    setupServerEvents() {
        this.wss.on('connection', (ws, request) => {
            this.handleNewConnection(ws, request);
        });

        this.wss.on('error', (error) => {
            logger.error('WebSocket server error:', error);
        });
    }

    async handleNewConnection(ws, request) {
        try {
            const clientId = uuidv4();
            const token = this.extractToken(request);
            
            if (!token) {
                ws.close(4001, 'No authentication token provided');
                return;
            }

            let userData;
            try {
                userData = await this.authenticateUser(token);
            } catch (error) {
                ws.close(4001, 'Invalid authentication token');
                return;
            }
            
            ws.isAlive = true;
            ws.lastActivity = Date.now();
            
            const clientInfo = {
                id: clientId,
                userId: userData.id,
                username: userData.username,
                currentTable: null,
                seatIndex: -1,
                connected: true,
                connectionTime: Date.now()
            };

            this.clients.set(ws, clientInfo);
            this.setupClientEvents(ws);
            
            this.sendToClient(ws, {
                type: MessageTypes.SERVER.CONNECTION_ESTABLISHED,
                clientId,
                userId: userData.id
            });

            logger.info(`Client connected: ${clientId} (${userData.username})`);

        } catch (error) {
            logger.error('Connection error:', error);
            ws.close(4001, error.message);
        }
    }

    setupClientEvents(ws) {
        ws.on('message', async (data) => {
            try {
                ws.lastActivity = Date.now();
                const message = JSON.parse(data.toString());
                await this.handleMessage(ws, message);
            } catch (error) {
                logger.error('Message handling error:', error);
                this.sendToClient(ws, {
                    type: MessageTypes.SERVER.ERROR,
                    error: 'Invalid message format'
                });
            }
        });

        ws.on('close', (code, reason) => {
            this.handleClientDisconnect(ws, code, reason);
        });

        ws.on('error', (error) => {
            logger.error('WebSocket error:', error);
        });

        ws.on('ping', () => {
            ws.lastActivity = Date.now();
        });

        ws.on('pong', () => {
            ws.lastActivity = Date.now();
            ws.isAlive = true;
        });
    }

    async handleMessage(ws, message) {
        const client = this.clients.get(ws);
        if (!client || !client.connected) {
            throw new Error('Client not found or disconnected');
        }

        switch (message.type) {
            case MessageTypes.CLIENT.JOIN_TABLE:
                await this.handleJoinTable(ws, message.tableId, message.seatIndex, message.buyinAmount);
                break;

            case MessageTypes.CLIENT.LEAVE_TABLE:
                await this.handleLeaveTable(ws);
                break;

            case MessageTypes.CLIENT.POKER_ACTION:
                await this.handlePokerAction(ws, message);
                break;

            case MessageTypes.CLIENT.REQUEST_TABLE_LIST:
                await this.handleTableListRequest(ws, message.stakeLevel);
                break;

            case MessageTypes.CLIENT.PING:
                this.sendToClient(ws, { type: MessageTypes.SERVER.PONG });
                break;

            default:
                logger.warn(`Unknown message type: ${message.type}`);
        }
    }

    async handleJoinTable(ws, tableId, seatIndex, buyinAmount) {
        const client = this.clients.get(ws);
        if (!client || !client.connected) {
            logger.error('Attempt to join table with invalid client');
            return;
        }

        try {
            // Leave current table if in one
            if (client.currentTable) {
                await this.handleLeaveTable(ws);
            }

            // Get or create game engine for this table
            let gameEngine = this.gameEngines.get(tableId);
            if (!gameEngine) {
                gameEngine = new PokerGameEngine(tableId, this);
                this.gameEngines.set(tableId, gameEngine);
                await gameEngine.loadFromRedis();
            }

            // Attempt to join the table
            const joinResult = await gameEngine.addPlayer(client.userId, client.username, seatIndex, buyinAmount);
            
            if (!joinResult.success) {
                this.sendToClient(ws, {
                    type: MessageTypes.SERVER.ERROR,
                    error: joinResult.error
                });
                return;
            }

            // Update client info
            client.currentTable = tableId;
            client.seatIndex = seatIndex;

            // Send confirmation to joining client
            this.sendToClient(ws, {
                type: MessageTypes.SERVER.TABLE_JOINED,
                tableId: tableId,
                seatIndex: seatIndex,
                gameState: await gameEngine.getGameState()
            });

            // Notify all players in the table
            await this.broadcastToTable(tableId, {
                type: MessageTypes.SERVER.GAME_STATE,
                data: {
                    event: 'player_joined',
                    tableId: tableId,
                    playerId: client.userId,
                    username: client.username,
                    seatIndex: seatIndex,
                    gameState: await gameEngine.getGameState()
                }
            });

            logger.info(`Client ${client.id} joined table ${tableId} at seat ${seatIndex}`);

        } catch (error) {
            logger.error('Error joining table:', error);
            this.sendToClient(ws, {
                type: MessageTypes.SERVER.ERROR,
                error: 'Failed to join table'
            });
        }
    }

    async handlePokerAction(ws, message) {
        const client = this.clients.get(ws);
        if (!client || !client.currentTable) {
            this.sendToClient(ws, {
                type: MessageTypes.SERVER.ERROR,
                error: 'Not seated at a table'
            });
            return;
        }

        const gameEngine = this.gameEngines.get(client.currentTable);
        if (!gameEngine) {
            this.sendToClient(ws, {
                type: MessageTypes.SERVER.ERROR,
                error: 'Table not found'
            });
            return;
        }

        try {
            const actionResult = await gameEngine.processAction(client.userId, message.action, message.amount);
            
            if (!actionResult.success) {
                this.sendToClient(ws, {
                    type: MessageTypes.SERVER.ERROR,
                    error: actionResult.error
                });
                return;
            }

            // Broadcast the action result to all players at the table
            await this.broadcastToTable(client.currentTable, {
                type: MessageTypes.SERVER.PLAYER_ACTION,
                data: {
                    action: actionResult.action,
                    gameState: await gameEngine.getGameState()
                }
            });

        } catch (error) {
            logger.error('Error processing poker action:', error);
            this.sendToClient(ws, {
                type: MessageTypes.SERVER.ERROR,
                error: 'Failed to process action'
            });
        }
    }

    async handleLeaveTable(ws) {
        const client = this.clients.get(ws);
        if (!client || !client.currentTable) return;

        const gameEngine = this.gameEngines.get(client.currentTable);
        if (gameEngine) {
            await gameEngine.removePlayer(client.userId);
        }

        const tableId = client.currentTable;
        client.currentTable = null;
        client.seatIndex = -1;

        this.sendToClient(ws, {
            type: MessageTypes.SERVER.TABLE_LEFT,
            tableId: tableId
        });

        // Notify other players
        await this.broadcastToTable(tableId, {
            type: MessageTypes.SERVER.GAME_STATE,
            data: {
                event: 'player_left',
                playerId: client.userId,
                gameState: gameEngine ? await gameEngine.getGameState() : null
            }
        });
    }

    async broadcastToTable(tableId, data) {
        // Broadcast to local clients
        await this.broadcastToLocalTable(tableId, data);
        
        // Publish to Redis for other instances
        try {
            await redisClient.publish('poker:table_events', JSON.stringify({
                tableId,
                type: data.type,
                data: data.data,
                excludeInstanceId: process.env.INSTANCE_ID || 'default'
            }));
        } catch (error) {
            console.error('Error publishing to Redis:', error);
        }
    }

    async broadcastToLocalTable(tableId, data) {
        let sentCount = 0;
        
        this.clients.forEach((client, ws) => {
            if (client.currentTable === tableId && ws.readyState === WebSocket.OPEN) {
                this.sendToClient(ws, data);
                sentCount++;
            }
        });
        
        logger.info(`Broadcast message sent to ${sentCount} local clients in table ${tableId}`);
    }

    sendToClient(ws, data) {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(data));
            } catch (error) {
                logger.error('Error sending message to client:', error);
            }
        }
    }

    extractToken(request) {
        const url = new URL(request.url, `http://${request.headers.host}`);
        return url.searchParams.get('token') || request.headers['authorization']?.replace('Bearer ', '');
    }

    async authenticateUser(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        } catch (error) {
            throw new Error('Invalid authentication token');
        }
    }

    async handleClientDisconnect(ws, code, reason) {
        const client = this.clients.get(ws);
        if (client) {
            client.connected = false;
            
            if (client.currentTable) {
                const gameEngine = this.gameEngines.get(client.currentTable);
                if (gameEngine) {
                    await gameEngine.handlePlayerDisconnect(client.userId);
                }
            }
            
            this.clients.delete(ws);
            logger.info(`Client disconnected: ${client.id}`);
        }
    }

    close(callback) {
        // Close all game engines
        for (const gameEngine of this.gameEngines.values()) {
            // Add cleanup logic if needed
        }
        this.gameEngines.clear();

        // Close WebSocket server
        this.wss.close(() => {
            logger.info('Poker WebSocket server closed');
            if (callback) callback();
        });
    }
}

module.exports = PokerWebSocketServer;
