// services/tableManager.js
const { redisClient } = require('./redisClient');
const { v4: uuidv4 } = require('uuid');

class TableManager {
    constructor() {
        this.stakelevels = {
            1: { smallBlind: 5, bigBlind: 10, minBuyin: 500, maxBuyin: 1000 },
            2: { smallBlind: 25, bigBlind: 50, minBuyin: 2500, maxBuyin: 5000 },
            3: { smallBlind: 50, bigBlind: 100, minBuyin: 5000, maxBuyin: 10000 },
            4: { smallBlind: 250, bigBlind: 500, minBuyin: 25000, maxBuyin: 50000 },
            5: { smallBlind: 500, bigBlind: 1000, minBuyin: 50000, maxBuyin: 100000 }
        };
        this.maxPlayersPerTable = 5;
        this.maxHumanPlayers = 2; // 2 humans + 3 bots
    }

    async findOrCreateTable(stakeLevel, userId) {
        try {
            console.log(`🏦 TableManager.findOrCreateTable: stakeLevel=${stakeLevel}, userId=${userId}`);
            const stakeConfig = this.stakelevels[stakeLevel];
            if (!stakeConfig) {
                console.error(`❌ Invalid stake level: ${stakeLevel}`);
                throw new Error('Invalid stake level');
            }
            console.log(`✅ Stake config found:`, stakeConfig);

            // First, try to find an available table for this stake level WITH OTHER HUMANS
            console.log(`🔍 Looking for available table...`);
            const availableTable = await this.findAvailableTable(stakeLevel, userId);
            
            if (availableTable) {
                console.log(`✅ Found available table ${availableTable.tableId} with ${availableTable.humanPlayerCount} human players`);
                return availableTable;
            }

            // No available table found, create a new one
            console.log(`🏗️ Creating new table for stake level ${stakeLevel} - no available tables with humans`);
            const newTable = await this.createNewTable(stakeLevel);
            console.log(`✅ New table created:`, newTable ? { tableId: newTable.tableId } : 'NULL');
            return newTable;

        } catch (error) {
            console.error('🚨 Error in findOrCreateTable:', error);
            console.error('🚨 Stack:', error.stack);
            throw error;
        }
    }

    async findAvailableTable(stakeLevel, userId) {
        try {
            const tablePattern = `poker:table:${stakeLevel}:*`;
            const tableKeys = await redisClient.keys(tablePattern);

            for (const tableKey of tableKeys) {
                const tableData = await redisClient.get(tableKey);
                if (!tableData) continue;

                const table = JSON.parse(tableData);
                const humanPlayerCount = this.countHumanPlayers(table);
                
                // IMPORTANT: Only return tables that have other human players
                // This ensures when a player leaves and rejoins, they get a new table
                // unless there's another human player at the same stake level
                if (humanPlayerCount > 0 && humanPlayerCount < this.maxHumanPlayers) {
                    // Check if the user is already at this table
                    const isPlayerAtTable = this.isPlayerAtTable(table, userId);
                    if (!isPlayerAtTable) {
                        return {
                            tableId: table.tableId,
                            stakeLevel: table.stakeLevel,
                            availableSeats: this.getAvailableSeats(table),
                            humanPlayerCount: humanPlayerCount
                        };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error finding available table:', error);
            return null;
        }
    }

    isPlayerAtTable(table, userId) {
        if (!table.players) return false;
        
        const players = table.players instanceof Map ? table.players : new Map(table.players);
        
        for (const player of players.values()) {
            if (player.userId === userId) {
                return true;
            }
        }
        
        return false;
    }

    async createNewTable(stakeLevel) {
        const tableId = `${stakeLevel}_${uuidv4()}`;
        const stakeConfig = this.stakelevels[stakeLevel];

        const tableData = {
            tableId: tableId,
            stakeLevel: parseInt(stakeLevel),
            smallBlind: stakeConfig.smallBlind,
            bigBlind: stakeConfig.bigBlind,
            minBuyin: stakeConfig.minBuyin,
            maxBuyin: stakeConfig.maxBuyin,
            players: new Map(),
            bots: await this.createBots(3, parseInt(stakeLevel)), // Pass stakeLevel directly
            gamePhase: 'waiting',
            createdAt: Date.now(),
            lastActivity: Date.now()
        };

        // Save to Redis
        const tableKey = `poker:table:${stakeLevel}:${tableId}`;
        await redisClient.setex(tableKey, 7200, JSON.stringify(this.serializeTable(tableData))); // 2 hour TTL

        console.log(`Created new table ${tableId} for stake level ${stakeLevel}`);

        return {
            tableId: tableId,
            stakeLevel: parseInt(stakeLevel),
            availableSeats: this.getAvailableSeats(tableData),
            humanPlayerCount: 0
        };
    }

    async createBots(count, stakeLevel) {
        const bots = new Map();
        const botNames = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley'];
        const stakeConfig = this.stakelevels[stakeLevel];
        
        if (!stakeConfig) {
            console.error(`Invalid stake level ${stakeLevel} for bot creation`);
            // Fallback to stake level 1
            stakeConfig = this.stakelevels[1];
        }
        
        console.log(`Creating ${count} bots for stake level ${stakeLevel} with ${stakeConfig.maxBuyin} chips each`);
        
        for (let i = 0; i < count; i++) {
            const botId = `bot_${i}`;
            bots.set(i + 2, { // Place bots in seats 2, 3, 4 (seats 0, 1 reserved for humans)
                userId: botId,
                username: botNames[i],
                isBot: true,
                chips: stakeConfig.maxBuyin, // Fixed: use correct stakeConfig
                cards: [],
                currentBet: 0,
                totalBet: 0,
                folded: false,
                allIn: false,
                connected: true,
                lastAction: null,
                seatIndex: i + 2
            });
        }
        
        console.log(`Created bots:`, Array.from(bots.values()).map(bot => `${bot.username}: ${bot.chips} chips`));
        return bots;
    }

    countHumanPlayers(table) {
        if (!table.players) return 0;
        
        const players = table.players instanceof Map ? table.players : new Map(table.players);
        let humanCount = 0;
        
        for (const player of players.values()) {
            if (!player.isBot) {
                humanCount++;
            }
        }
        
        return humanCount;
    }

    getAvailableSeats(table) {
        const occupiedSeats = new Set();
        
        // Check human players
        if (table.players) {
            const players = table.players instanceof Map ? table.players : new Map(table.players);
            console.log('DEBUG: Human players:', Array.from(players.entries()));
            for (const [seatIndex] of players) {
                occupiedSeats.add(seatIndex);
            }
        }
        
        // Check bots
        if (table.bots) {
            const bots = table.bots instanceof Map ? table.bots : new Map(table.bots);
            console.log('DEBUG: Bots:', Array.from(bots.entries()));
            for (const [seatIndex] of bots) {
                occupiedSeats.add(seatIndex);
            }
        }
        
        console.log('DEBUG: Occupied seats:', Array.from(occupiedSeats));

        // Return available human seats (0 and 1)
        const humanSeats = [0, 1];
        const availableSeats = humanSeats.filter(seat => !occupiedSeats.has(seat));
        console.log('DEBUG: Available seats:', availableSeats);
    
        return availableSeats;
    }

    async assignSeatToPlayer(tableId, userId, username, buyinAmount) {
        try {
            const tableKey = `poker:table:*:${tableId}`;
            const tableKeys = await redisClient.keys(tableKey);
            
            if (tableKeys.length === 0) {
                throw new Error('Table not found');
            }

            const tableData = await redisClient.get(tableKeys[0]);
            const table = JSON.parse(tableData);
            
            const availableSeats = this.getAvailableSeats(table);
            
            if (availableSeats.length === 0) {
                throw new Error('No available seats');
            }

            // Assign first available seat
            const seatIndex = availableSeats[0];
            
            // Initialize players map if it doesn't exist
            if (!table.players) {
                table.players = [];
            }

            // Add player to table
            const playerData = {
                userId: userId,
                username: username,
                isBot: false,
                chips: buyinAmount,
                cards: [],
                currentBet: 0,
                totalBet: 0,
                folded: false,
                allIn: false,
                connected: true,
                lastAction: null,
                seatIndex: seatIndex
            };

            // Convert to array format for Redis storage
            if (Array.isArray(table.players)) {
                table.players.push([seatIndex, playerData]);
            } else {
                table.players = [[seatIndex, playerData]];
            }

            table.lastActivity = Date.now();

            // Save updated table
            await redisClient.setex(tableKeys[0], 7200, JSON.stringify(table));

            return {
                success: true,
                seatIndex: seatIndex,
                tableData: table
            };

        } catch (error) {
            console.error('Error assigning seat:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async removePlayerFromTable(tableId, userId) {
        try {
            const tableKey = `poker:table:*:${tableId}`;
            const tableKeys = await redisClient.keys(tableKey);
            
            if (tableKeys.length === 0) {
                console.log(`Table ${tableId} not found for player removal`);
                return { success: false, error: 'Table not found' };
            }

            const tableData = await redisClient.get(tableKeys[0]);
            const table = JSON.parse(tableData);
            
            // Remove player from table
            if (table.players) {
                if (Array.isArray(table.players)) {
                    table.players = table.players.filter(([seatIndex, player]) => player.userId !== userId);
                } else {
                    // Handle Map format
                    const players = new Map(table.players);
                    for (const [seatIndex, player] of players) {
                        if (player.userId === userId) {
                            players.delete(seatIndex);
                            break;
                        }
                    }
                    table.players = Array.from(players);
                }
            }

            table.lastActivity = Date.now();
            
            // Check if table should be destroyed (no human players left)
            const humanPlayerCount = this.countHumanPlayers(table);
            
            if (humanPlayerCount === 0) {
                console.log(`Destroying table ${tableId} - no human players left`);
                await redisClient.del(tableKeys[0]);
                return { success: true, tableDestroyed: true };
            } else {
                // Save updated table
                await redisClient.setex(tableKeys[0], 7200, JSON.stringify(table));
                console.log(`Removed player ${userId} from table ${tableId}. ${humanPlayerCount} human players remaining.`);
                return { success: true, tableDestroyed: false, remainingHumans: humanPlayerCount };
            }

        } catch (error) {
            console.error('Error removing player from table:', error);
            return { success: false, error: error.message };
        }
    }

    async cleanupEmptyTables() {
        try {
            const tablePattern = 'poker:table:*';
            const tableKeys = await redisClient.keys(tablePattern);
            
            let cleanedCount = 0;
            
            for (const tableKey of tableKeys) {
                const tableData = await redisClient.get(tableKey);
                if (!tableData) continue;

                const table = JSON.parse(tableData);
                const humanPlayerCount = this.countHumanPlayers(table);
                
                // Remove tables with no human players
                if (humanPlayerCount === 0) {
                    await redisClient.del(tableKey);
                    cleanedCount++;
                    console.log(`Cleaned up empty table: ${table.tableId}`);
                }
            }
            
            if (cleanedCount > 0) {
                console.log(`Cleaned up ${cleanedCount} empty tables`);
            }
            
            return cleanedCount;
        } catch (error) {
            console.error('Error cleaning up empty tables:', error);
            return 0;
        }
    }

    serializeTable(tableData) {
        return {
            ...tableData,
            players: Array.from(tableData.players || []),
            bots: Array.from(tableData.bots || [])
        };
    }

    async getTableList(stakeLevel = null) {
        try {
            const pattern = stakeLevel ? `poker:table:${stakeLevel}:*` : 'poker:table:*';
            const tableKeys = await redisClient.keys(pattern);
            
            const tables = [];
            
            for (const key of tableKeys) {
                const tableData = await redisClient.get(key);
                if (tableData) {
                    const table = JSON.parse(tableData);
                    const stakeConfig = this.stakelevels[table.stakeLevel] || this.stakelevels[1];
                    
                    tables.push({
                        tableId: table.tableId,
                        stakeLevel: table.stakeLevel,
                        playerCount: this.countHumanPlayers(table),
                        maxPlayers: this.maxHumanPlayers,
                        gamePhase: table.gamePhase,
                        smallBlind: table.smallBlind,
                        bigBlind: table.bigBlind,
                        minBuyin: stakeConfig.minBuyin,
                        maxBuyin: stakeConfig.maxBuyin,
                        availableSeats: this.getAvailableSeats(table)
                    });
                }
            }
            
            return tables;
        } catch (error) {
            console.error('Error getting table list:', error);
            return [];
        }
    }
}

module.exports = new TableManager();


