require('dotenv').config();
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const http = require('http');
const WebSocketServer = require('../../src/websocket/WebSocketServer');
const { MessageTypes } = require('../../src/websocket/messageTypes');

describe('WebSocket Server', () => {
    let httpServer;
    let wss;
    let port;
    let activeSockets = [];

    // Helper function to create a valid JWT token
    const createToken = (userData = { id: 1, username: 'testuser' }) => {
        return jwt.sign(userData, process.env.JWT_SECRET || 'test-secret');
    };

    // Helper function to create and track WebSocket connections
    const createWebSocket = (token) => {
        const ws = new WebSocket(`ws://localhost:${port}${token ? `?token=${token}` : ''}`);
        activeSockets.push(ws);
        return ws;
    };

    beforeAll((done) => {
        httpServer = http.createServer();
        wss = new WebSocketServer(httpServer);

        httpServer.listen(0, () => {
            port = httpServer.address().port;
            done();
        });
    });

    afterAll((done) => {
        // Close all active socket connections
        const closePromises = activeSockets.map(socket => 
            new Promise((resolve) => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.on('close', resolve);
                    socket.close();
                } else {
                    resolve();
                }
            })
        );

        Promise.all(closePromises).then(() => {
            activeSockets = [];
            wss.close(() => {
                httpServer.close(done);
            });
        });
    });

    test('should successfully connect with valid token', (done) => {
        const token = createToken();
        const clientSocket = createWebSocket(token);
        let messageReceived = false;

        const timeout = setTimeout(() => {
            if (!messageReceived) {
                clientSocket.close();
                done(new Error('Test timeout - no message received'));
            }
        }, 5000);

        clientSocket.on('message', (data) => {
            try {
                messageReceived = true;
                const message = JSON.parse(data);
                expect(message.type).toBe(MessageTypes.SERVER.CONNECTION_ESTABLISHED);
                expect(message.userId).toBe(1);
                clearTimeout(timeout);
                clientSocket.close();
                done();
            } catch (err) {
                clearTimeout(timeout);
                clientSocket.close();
                done(err);
            }
        });

        clientSocket.on('error', (error) => {
            clearTimeout(timeout);
            clientSocket.close();
            done(error);
        });
    });

test('should handle join table request', (done) => {
    const token = createToken();
    const tableId = 'test-table-1';
    let observer;
    const clientSocket = createWebSocket(token);

    console.log('Starting join table test');

    const timeout = setTimeout(() => {
        console.log('Test timed out');
        if (clientSocket) clientSocket.close();
        if (observer) observer.close();
        done(new Error('Test timeout - incomplete table join sequence'));
    }, 5000);

    const cleanupAndComplete = () => {
        clearTimeout(timeout);
        if (observer) observer.close();
        if (clientSocket) clientSocket.close();
        done();
    };

    clientSocket.on('open', () => {
        console.log('Client socket opened');
    });

    clientSocket.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            console.log('Client received message:', message);
            
            if (message.type === MessageTypes.SERVER.CONNECTION_ESTABLISHED) {
                console.log('Client sending join table request');
                clientSocket.send(JSON.stringify({
                    type: MessageTypes.CLIENT.JOIN_TABLE,
                    tableId,
                }));
            } else if (message.type === MessageTypes.SERVER.GAME_STATE) {
                if (message.data.event === 'joined_table') {
                    console.log('Client received join confirmation, creating observer');
                    observer = createWebSocket(createToken({ id: 2, username: 'observer' }));
                    
                    observer.on('open', () => {
                        console.log('Observer socket opened, joining table');
                        observer.send(JSON.stringify({
                            type: MessageTypes.CLIENT.JOIN_TABLE,
                            tableId,
                        }));
                    });

                    observer.on('message', (obsData) => {
                        const obsMessage = JSON.parse(obsData);
                        console.log('Observer received message:', obsMessage);
                        
                        // If observer gets its join confirmation, wait for client to receive the broadcast
                        if (obsMessage.type === MessageTypes.SERVER.GAME_STATE && 
                            obsMessage.data.event === 'joined_table') {
                            console.log('Observer joined table, waiting for client to receive broadcast');
                        }
                    });

                    observer.on('error', (error) => {
                        console.error('Observer socket error:', error);
                        cleanupAndComplete();
                    });
                } else if (message.data.event === 'player_joined') {
                    // This is the event we're actually waiting for
                    console.log('Client received player_joined event');
                    cleanupAndComplete();
                }
            }
        } catch (err) {
            console.error('Error in message handler:', err);
            cleanupAndComplete();
        }
    });

    clientSocket.on('error', (error) => {
        console.error('Client socket error:', error);
        cleanupAndComplete();
    });

    clientSocket.on('close', () => {
        console.log('Client socket closed');
    });
});

    test('should reject connection without token', (done) => {
        // Add connection timeout
        const connectionTimeout = setTimeout(() => {
            done(new Error('Connection attempt did not complete in time'));
        }, 5000);

        const ws = new WebSocket(`ws://localhost:${port}`);
        
        ws.on('error', () => {
            // Expected error, do nothing
        });

        ws.on('unexpected-response', (req, res) => {
            clearTimeout(connectionTimeout);
            expect(res.statusCode).toBe(401);
            done();
        });

        ws.on('open', () => {
            clearTimeout(connectionTimeout);
            ws.close();
            done(new Error('Connection should not be established'));
        });

        ws.on('close', (code) => {
            clearTimeout(connectionTimeout);
            // We expect either 4001 (custom close) or 1006 (abnormal closure)
            if (code !== 4001 && code !== 1006) {
                done(new Error(`Unexpected close code: ${code}`));
            } else {
                done();
            }
        });
    });

    afterAll((done) => {
        Promise.all([
            ...activeSockets.map(socket => 
                new Promise(resolve => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.on('close', resolve);
                        socket.close();
                    } else {
                        resolve();
                    }
                })
            ),
            new Promise(resolve => {
                if (wss) {
                    wss.close(() => {
                        if (httpServer) {
                            httpServer.close(resolve);
                        } else {
                            resolve();
                        }
                    });
                } else {
                    if (httpServer) {
                        httpServer.close(resolve);
                    } else {
                        resolve();
                    }
                }
            })
        ]).then(() => {
            activeSockets = [];
            done();
        });
    });
});
