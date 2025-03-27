const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const { MessageTypes } = require('./messageTypes');
const fs = require('fs');

class WebSocketServer {
    constructor(httpServer) {
        this.tables = new Map(); // tableId -> Set of connected clients
        this.clients = new Map(); // ws -> client info
        
        // Configure WebSocket server with SSL in production
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
        logger.info(`WebSocket server initialized in ${process.env.NODE_ENV || 'development'} mode`);

        // Set up periodic cleanup of stale connections
        this.cleanupInterval = setInterval(() => {
            this.cleanupStaleConnections();
        }, 30000); // Run cleanup every 30 seconds
    }

    setupServerEvents() {
        this.wss.on('connection', (ws, request) => {
            this.handleNewConnection(ws, request);
        });

        this.wss.on('error', (error) => {
            logger.error('WebSocket server error:', error);
        });

        // Handle server shutdown
        this.wss.on('close', () => {
            logger.info('WebSocket server closing');
            this.cleanupAllConnections();
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
            
            // Setup ping-pong for this connection
            ws.isAlive = true;
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            // Set last activity timestamp
            ws.lastActivity = Date.now();

            this.clients.set(ws, {
                id: clientId,
                userId: userData.id,
                username: userData.username,
                currentTable: null,
                connected: true,
                connectionTime: Date.now()
            });

            this.setupClientEvents(ws);
            
            this.sendToClient(ws, {
                type: MessageTypes.SERVER.CONNECTION_ESTABLISHED,
                clientId,
                userId: userData.id
            });

            logger.info(`Client connected: ${clientId}`);

        } catch (error) {
            logger.error('Connection error:', error);
            ws.close(4001, error.message);
        }
    }

    setupClientEvents(ws) {
        ws.on('message', async (data) => {
            try {
                ws.lastActivity = Date.now(); // Update activity timestamp
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
            // Don't close here, let the 'close' event handle cleanup
        });

        ws.on('ping', () => {
            ws.lastActivity = Date.now();
            this.sendToClient(ws, { type: MessageTypes.SERVER.PONG });
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
                await this.handleJoinTable(ws, message.tableId);
                break;

            case MessageTypes.CLIENT.LEAVE_TABLE:
                await this.handleLeaveTable(ws);
                break;

            case MessageTypes.CLIENT.PING:
                this.sendToClient(ws, { type: MessageTypes.SERVER.PONG });
                break;

            default:
                logger.warn(`Unknown message type: ${message.type}`);
        }
    }

    handleClientDisconnect(ws, code, reason) {
        const client = this.clients.get(ws);
        if (client) {
            client.connected = false;
            if (client.currentTable) {
                this.handleLeaveTable(ws);
            }
            this.clients.delete(ws);
            logger.info(`Client disconnected: ${client.id}, Code: ${code}, Reason: ${reason || 'No reason provided'}`);
        }
    }

    async handleJoinTable(ws, tableId) {
        const client = this.clients.get(ws);
        if (!client || !client.connected) {
            logger.error('Attempt to join table with invalid client');
            return;
        }

        logger.info(`Client ${client.id} attempting to join table ${tableId}`);

        // Leave current table if in one
        if (client.currentTable) {
            logger.info(`Client ${client.id} leaving current table ${client.currentTable}`);
            await this.handleLeaveTable(ws);
        }

        // Create table if it doesn't exist
        if (!this.tables.has(tableId)) {
            logger.info(`Creating new table ${tableId}`);
            this.tables.set(tableId, new Set());
        }

        // Add client to table
        this.tables.get(tableId).add(ws);
        client.currentTable = tableId;
        logger.info(`Client ${client.id} joined table ${tableId}`);

        // Send confirmation to the joining client
        this.sendToClient(ws, {
            type: MessageTypes.SERVER.GAME_STATE,
            data: {
                event: 'joined_table',
                tableId: tableId
            }
        });

        // Get current table participants
        const participants = Array.from(this.tables.get(tableId))
            .map(socket => this.clients.get(socket))
            .filter(c => c && c.id !== client.id)
            .map(c => ({ id: c.userId, username: c.username }));

        logger.info(`Current participants in table ${tableId}:`, participants);

        // Notify others in the table
        this.broadcastToTable(tableId, {
            type: MessageTypes.SERVER.GAME_STATE,
            data: {
                event: 'player_joined',
                playerId: client.userId,
                username: client.username
            }
        }, ws);
        
        logger.info(`Broadcast player_joined event for client ${client.id} to table ${tableId}`);
    }

    async handleLeaveTable(ws) {
        const client = this.clients.get(ws);
        if (!client || !client.currentTable) return;

        const tableId = client.currentTable;
        const table = this.tables.get(tableId);
        
        if (table) {
            table.delete(ws);
            if (table.size === 0) {
                this.tables.delete(tableId);
            } else {
                this.broadcastToTable(tableId, {
                    type: MessageTypes.SERVER.GAME_STATE,
                    data: {
                        event: 'player_left',
                        playerId: client.userId
                    }
                });
            }
        }

        client.currentTable = null;
        
        // Confirm to the client they've left the table
        this.sendToClient(ws, {
            type: MessageTypes.SERVER.GAME_STATE,
            data: {
                event: 'left_table',
                tableId: tableId
            }
        });
    }

    extractToken(request) {
        const url = new URL(request.url, `http://${request.headers.host}`);
        return url.searchParams.get('token') || request.headers['authorization'];
    }

    async authenticateUser(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        } catch (error) {
            throw new Error('Invalid authentication token');
        }
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

    broadcastToTable(tableId, data, excludeWs = null) {
        const table = this.tables.get(tableId);
        if (!table) {
            logger.warn(`Attempt to broadcast to non-existent table ${tableId}`);
            return;
        }

        let sentCount = 0;
        table.forEach(ws => {
            if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
                this.sendToClient(ws, data);
                sentCount++;
            }
        });
        
        logger.info(`Broadcast message sent to ${sentCount} clients in table ${tableId}`);
    }

    cleanupStaleConnections() {
        const now = Date.now();
        const staleTimeout = 60000; // 60 seconds

        this.clients.forEach((client, ws) => {
            if (!ws.isAlive || (now - ws.lastActivity) > staleTimeout) {
                logger.info(`Cleaning up stale connection for client: ${client.id}`);
                ws.terminate();
                this.handleClientDisconnect(ws, 1001, 'Connection timeout');
            } else {
                ws.ping();
            }
        });
    }

    cleanupAllConnections() {
        this.clients.forEach((client, ws) => {
            try {
                ws.close(1000, 'Server shutting down');
            } catch (error) {
                logger.error(`Error closing connection for client ${client.id}:`, error);
            }
        });

        this.clients.clear();
        this.tables.clear();
    }

    close(callback) {
        // Stop the cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Clean up all connections
        this.cleanupAllConnections();
        
        // Close the WebSocket server
        this.wss.close(() => {
            logger.info('WebSocket server closed');
            if (callback) callback();
        });
    }

    // Utility method to get server stats
    getStats() {
        return {
            totalConnections: this.clients.size,
            totalTables: this.tables.size,
            tables: Array.from(this.tables.entries()).map(([tableId, clients]) => ({
                tableId,
                playerCount: clients.size
            })),
            uptime: process.uptime()
        };
    }
}

module.exports = WebSocketServer;
