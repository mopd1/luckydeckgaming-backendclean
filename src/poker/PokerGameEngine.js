// src/poker/PokerGameEngine.js
const { redisClient } = require('../../services/redisClient');
const PokerDeck = require('./PokerDeck');
const PokerHand = require('./PokerHand');

class PokerGameEngine {
    constructor(tableId, websocketServer) {
        this.tableId = tableId;
        this.websocketServer = websocketServer;
        this.players = new Map(); // seatIndex -> player data
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.gamePhase = 'waiting'; // waiting, preflop, flop, turn, river, showdown
        this.currentPlayerIndex = -1;
        this.dealerIndex = 0;
        this.smallBlindIndex = -1;
        this.bigBlindIndex = -1;
        this.handNumber = 0;
        this.deck = null;
        this.lastAction = null;
        this.actionTimeout = null;
        
        // Game configuration
        this.maxPlayers = 5;
        this.smallBlind = 50; // Will be set based on stake level
        this.bigBlind = 100;
        this.actionTimeLimit = 30000; // 30 seconds
    }

    async loadFromRedis() {
        try {
            const gameStateKey = `poker:table:${this.tableId}`;
            const gameStateData = await redisClient.get(gameStateKey);
            
            if (gameStateData) {
                const gameState = JSON.parse(gameStateData);
                this.deserializeGameState(gameState);
                console.log(`Loaded game state for table ${this.tableId}`);
            } else {
                // Initialize new table
                await this.initializeNewTable();
                console.log(`Initialized new table ${this.tableId}`);
            }
        } catch (error) {
            console.error(`Error loading table ${this.tableId} from Redis:`, error);
            await this.initializeNewTable();
        }
    }

    async saveToRedis() {
        try {
            const gameStateKey = `poker:table:${this.tableId}`;
            const gameState = this.serializeGameState();
            await redisClient.setex(gameStateKey, 3600, JSON.stringify(gameState)); // 1 hour TTL
        } catch (error) {
            console.error(`Error saving table ${this.tableId} to Redis:`, error);
        }
    }

    async initializeNewTable() {
        this.players.clear();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.gamePhase = 'waiting';
        this.currentPlayerIndex = -1;
        this.dealerIndex = 0;
        this.handNumber = 0;
        this.deck = new PokerDeck();
        
        await this.saveToRedis();
    }

    async addPlayer(userId, username, seatIndex, buyinAmount) {
        if (this.players.has(seatIndex)) {
            return { success: false, error: 'Seat already occupied' };
        }

        if (this.players.size >= this.maxPlayers) {
            return { success: false, error: 'Table is full' };
        }

        if (buyinAmount < this.bigBlind * 20) {
            return { success: false, error: 'Minimum buyin is 20 big blinds' };
        }

        const player = {
            userId,
            username,
            seatIndex,
            chips: buyinAmount,
            cards: [],
            currentBet: 0,
            totalBet: 0,
            folded: false,
            allIn: false,
            connected: true,
            lastAction: null,
            actionTime: null
        };

        this.players.set(seatIndex, player);

        // Start game if we have enough players and we're waiting
        if (this.players.size >= 2 && this.gamePhase === 'waiting') {
            setTimeout(() => {
                this.startNewHand();
            }, 3000); // 3 second delay before starting
        }

        return { success: true, player };
    }

    async removePlayer(userId) {
        let playerToRemove = null;
        let seatIndex = -1;

        for (const [seat, player] of this.players) {
            if (player.userId === userId) {
                playerToRemove = player;
                seatIndex = seat;
                break;
            }
        }

        if (!playerToRemove) {
            return { success: false, error: 'Player not found' };
        }

        this.players.delete(seatIndex);

        // Handle game state if player was in active hand
        if (this.gamePhase !== 'waiting' && this.players.size < 2) {
            await this.endGame();
        }

        return { success: true };
    }

    async processAction(userId, action, amount = 0) {
        const currentPlayer = this.getCurrentPlayer();
        
        if (!currentPlayer || currentPlayer.userId !== userId) {
            return { success: false, error: 'Not your turn' };
        }

        if (this.gamePhase === 'waiting' || this.gamePhase === 'showdown') {
            return { success: false, error: 'Game not in progress' };
        }

        // Clear action timeout
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }

        let actionResult = { success: true, action: { type: action, amount, player: currentPlayer.username } };

        switch (action) {
            case 'fold':
                currentPlayer.folded = true;
                currentPlayer.lastAction = 'fold';
                break;

            case 'check':
                if (this.currentBet > currentPlayer.currentBet) {
                    return { success: false, error: 'Cannot check, must call or fold' };
                }
                currentPlayer.lastAction = 'check';
                break;

            case 'call':
                const callAmount = this.currentBet - currentPlayer.currentBet;
                if (callAmount > currentPlayer.chips) {
                    // All-in
                    this.pot += currentPlayer.chips;
                    currentPlayer.currentBet += currentPlayer.chips;
                    currentPlayer.totalBet += currentPlayer.chips;
                    currentPlayer.chips = 0;
                    currentPlayer.allIn = true;
                    currentPlayer.lastAction = 'all-in';
                } else {
                    this.pot += callAmount;
                    currentPlayer.chips -= callAmount;
                    currentPlayer.currentBet += callAmount;
                    currentPlayer.totalBet += callAmount;
                    currentPlayer.lastAction = 'call';
                }
                break;

            case 'raise':
                const raiseAmount = amount;
                const totalNeeded = this.currentBet + raiseAmount - currentPlayer.currentBet;
                
                if (totalNeeded > currentPlayer.chips) {
                    return { success: false, error: 'Insufficient chips' };
                }

                if (raiseAmount < this.bigBlind && currentPlayer.chips > totalNeeded) {
                    return { success: false, error: 'Minimum raise is one big blind' };
                }

                this.pot += totalNeeded;
                currentPlayer.chips -= totalNeeded;
                currentPlayer.currentBet = this.currentBet + raiseAmount;
                currentPlayer.totalBet += totalNeeded;
                this.currentBet = currentPlayer.currentBet;
                currentPlayer.lastAction = `raise ${raiseAmount}`;
                
                if (currentPlayer.chips === 0) {
                    currentPlayer.allIn = true;
                }
                break;

            default:
                return { success: false, error: 'Invalid action' };
        }

        // Move to next player
        await this.moveToNextPlayer();

        return actionResult;
    }

    async moveToNextPlayer() {
        const activePlayers = this.getActivePlayers();
        
        if (activePlayers.length <= 1) {
            await this.endHand();
            return;
        }

        // Check if betting round is complete
        const playersNeedingToAct = activePlayers.filter(p => 
            p.currentBet < this.currentBet && !p.allIn
        );

        if (playersNeedingToAct.length === 0) {
            await this.moveToNextPhase();
            return;
        }

        // Find next active player
        let nextIndex = (this.currentPlayerIndex + 1) % this.maxPlayers;
        let attempts = 0;

        while (attempts < this.maxPlayers) {
            if (this.players.has(nextIndex)) {
                const player = this.players.get(nextIndex);
                if (!player.folded && !player.allIn && player.currentBet < this.currentBet) {
                    this.currentPlayerIndex = nextIndex;
                    this.startActionTimer();
                    return;
                }
            }
            nextIndex = (nextIndex + 1) % this.maxPlayers;
            attempts++;
        }

        // If we reach here, move to next phase
        await this.moveToNextPhase();
    }

    async moveToNextPhase() {
        // Reset current bets for next round
        for (const player of this.players.values()) {
            player.currentBet = 0;
        }
        this.currentBet = 0;

        switch (this.gamePhase) {
            case 'preflop':
                this.gamePhase = 'flop';
                this.dealCommunityCards(3);
                break;
            case 'flop':
                this.gamePhase = 'turn';
                this.dealCommunityCards(1);
                break;
            case 'turn':
                this.gamePhase = 'river';
                this.dealCommunityCards(1);
                break;
            case 'river':
                await this.showdown();
                return;
        }

        // Start betting with first active player after dealer
        this.setFirstPlayerToAct();
        this.startActionTimer();
    }

    startActionTimer() {
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
        }

        this.actionTimeout = setTimeout(async () => {
            // Auto-fold the player
            const currentPlayer = this.getCurrentPlayer();
            if (currentPlayer) {
                console.log(`Player ${currentPlayer.username} timed out, auto-folding`);
                await this.processAction(currentPlayer.userId, 'fold');
            }
        }, this.actionTimeLimit);
    }

    startNewHand() {
        if (this.players.size < 2) {
            this.gamePhase = 'waiting';
            return;
        }

        this.handNumber++;
        this.gamePhase = 'preflop';
        this.deck = new PokerDeck();
        this.deck.shuffle();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = this.bigBlind;

        // Reset all players for new hand
        for (const player of this.players.values()) {
            player.cards = [];
            player.currentBet = 0;
            player.totalBet = 0;
            player.folded = false;
            player.allIn = false;
            player.lastAction = null;
        }

        // Set positions
        this.setPositions();
        
        // Post blinds
        this.postBlinds();
        
        // Deal hole cards
        this.dealHoleCards();
        
        // Set first player to act (after big blind)
        this.setFirstPlayerToAct();
        
        // Start action timer
        this.startActionTimer();

        console.log(`Started new hand ${this.handNumber} at table ${this.tableId}`);
    }

    setPositions() {
        const playerSeats = Array.from(this.players.keys()).sort((a, b) => a - b);
        
        if (playerSeats.length >= 2) {
            this.dealerIndex = playerSeats[this.handNumber % playerSeats.length];
            this.smallBlindIndex = playerSeats[(this.handNumber + 1) % playerSeats.length];
            this.bigBlindIndex = playerSeats[(this.handNumber + 2) % playerSeats.length];
        }
    }

    postBlinds() {
        if (this.players.has(this.smallBlindIndex)) {
            const sbPlayer = this.players.get(this.smallBlindIndex);
            const sbAmount = Math.min(this.smallBlind, sbPlayer.chips);
            sbPlayer.chips -= sbAmount;
            sbPlayer.currentBet = sbAmount;
            sbPlayer.totalBet = sbAmount;
            this.pot += sbAmount;
            sbPlayer.lastAction = `small blind ${sbAmount}`;
        }

        if (this.players.has(this.bigBlindIndex)) {
            const bbPlayer = this.players.get(this.bigBlindIndex);
            const bbAmount = Math.min(this.bigBlind, bbPlayer.chips);
            bbPlayer.chips -= bbAmount;
            bbPlayer.currentBet = bbAmount;
            bbPlayer.totalBet = bbAmount;
            this.pot += bbAmount;
            bbPlayer.lastAction = `big blind ${bbAmount}`;
        }
    }

    dealHoleCards() {
        const playerSeats = Array.from(this.players.keys()).sort((a, b) => a - b);
        
        // Deal 2 cards to each player
        for (let i = 0; i < 2; i++) {
            for (const seat of playerSeats) {
                const player = this.players.get(seat);
                player.cards.push(this.deck.deal());
            }
        }
    }

    dealCommunityCards(count) {
        for (let i = 0; i < count; i++) {
            this.communityCards.push(this.deck.deal());
        }
    }

    setFirstPlayerToAct() {
        const playerSeats = Array.from(this.players.keys()).sort((a, b) => a - b);
        
        if (this.gamePhase === 'preflop') {
            // First to act is player after big blind
            const bbIndex = playerSeats.indexOf(this.bigBlindIndex);
            const firstActorSeat = playerSeats[(bbIndex + 1) % playerSeats.length];
            this.currentPlayerIndex = firstActorSeat;
        } else {
            // Post-flop, first to act is first active player after dealer
            const dealerIdx = playerSeats.indexOf(this.dealerIndex);
            let nextIdx = (dealerIdx + 1) % playerSeats.length;
            
            while (nextIdx !== dealerIdx) {
                const seat = playerSeats[nextIdx];
                const player = this.players.get(seat);
                if (!player.folded && !player.allIn) {
                    this.currentPlayerIndex = seat;
                    break;
                }
                nextIdx = (nextIdx + 1) % playerSeats.length;
            }
        }
    }

    getCurrentPlayer() {
        return this.players.get(this.currentPlayerIndex);
    }

    getActivePlayers() {
        return Array.from(this.players.values()).filter(p => !p.folded);
    }

    async showdown() {
        this.gamePhase = 'showdown';
        
        const activePlayers = this.getActivePlayers();
        const winners = this.determineWinners(activePlayers);
        
        // Distribute pot
        const winAmount = Math.floor(this.pot / winners.length);
        for (const winner of winners) {
            winner.chips += winAmount;
        }

        // Record hand results
        await this.recordHandResults(winners);

        // Schedule next hand
        setTimeout(() => {
            this.startNewHand();
        }, 5000);
    }

    determineWinners(players) {
        let bestHandValue = -1;
        let winners = [];

        for (const player of players) {
            const hand = new PokerHand(player.cards.concat(this.communityCards));
            const handValue = hand.getValue();
            
            if (handValue > bestHandValue) {
                bestHandValue = handValue;
                winners = [player];
            } else if (handValue === bestHandValue) {
                winners.push(player);
            }
        }

        return winners;
    }

    async recordHandResults(winners) {
        // Implementation for recording hand results to database
        // This would integrate with your existing poker.js routes
    }

    async handlePlayerDisconnect(userId) {
        const player = Array.from(this.players.values()).find(p => p.userId === userId);
        if (player) {
            player.connected = false;
            // Implement disconnect logic (auto-fold, sit out, etc.)
            if (this.currentPlayerIndex === player.seatIndex && this.gamePhase !== 'waiting') {
                await this.processAction(userId, 'fold');
            }
        }
    }

    async getGameState() {
        return {
            tableId: this.tableId,
            gamePhase: this.gamePhase,
            players: Array.from(this.players.entries()).map(([seat, player]) => ({
                seatIndex: seat,
                username: player.username,
                chips: player.chips,
                cards: player.cards, // Only send to specific player in real implementation
                currentBet: player.currentBet,
                folded: player.folded,
                allIn: player.allIn,
                lastAction: player.lastAction,
                connected: player.connected
            })),
            communityCards: this.communityCards,
            pot: this.pot,
            currentBet: this.currentBet,
            currentPlayerIndex: this.currentPlayerIndex,
            dealerIndex: this.dealerIndex,
            handNumber: this.handNumber
        };
    }

    serializeGameState() {
        return {
            tableId: this.tableId,
            players: Array.from(this.players.entries()),
            communityCards: this.communityCards,
            pot: this.pot,
            currentBet: this.currentBet,
            gamePhase: this.gamePhase,
            currentPlayerIndex: this.currentPlayerIndex,
            dealerIndex: this.dealerIndex,
            smallBlindIndex: this.smallBlindIndex,
            bigBlindIndex: this.bigBlindIndex,
            handNumber: this.handNumber,
            smallBlind: this.smallBlind,
            bigBlind: this.bigBlind
        };
    }

    deserializeGameState(gameState) {
        this.tableId = gameState.tableId;
        this.players = new Map(gameState.players);
        this.communityCards = gameState.communityCards || [];
        this.pot = gameState.pot || 0;
        this.currentBet = gameState.currentBet || 0;
        this.gamePhase = gameState.gamePhase || 'waiting';
        this.currentPlayerIndex = gameState.currentPlayerIndex || -1;
        this.dealerIndex = gameState.dealerIndex || 0;
        this.smallBlindIndex = gameState.smallBlindIndex || -1;
        this.bigBlindIndex = gameState.bigBlindIndex || -1;
        this.handNumber = gameState.handNumber || 0;
        this.smallBlind = gameState.smallBlind || 50;
        this.bigBlind = gameState.bigBlind || 100;
    }

    async endGame() {
        this.gamePhase = 'waiting';
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
        await this.saveToRedis();
    }

    async endHand() {
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length === 1) {
            // Single winner
            activePlayers[0].chips += this.pot;
            await this.recordHandResults(activePlayers);
            
            setTimeout(() => {
                this.startNewHand();
            }, 3000);
        }
    }
}

module.exports = PokerGameEngine;
