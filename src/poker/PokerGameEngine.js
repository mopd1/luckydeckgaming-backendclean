// src/poker/PokerGameEngine.js
const { redisClient } = require('../../services/redisClient');
const PokerDeck = require('./PokerDeck');
const { HandEvaluator, HandRank } = require('./HandEvaluator');
const { BotPlayer } = require('./BotPlayer');

class PokerGameEngine {
    constructor(tableId, websocketServer) {
        this.tableId = tableId;
        this.websocketServer = websocketServer;
        
        // Game state (matching TableManager.gd structure)
        this.players = new Array(5).fill(null); // MAX_PLAYERS = 5
        this.activeHand = false;
        this.dealerPosition = 0;
        this.currentPot = 0;
        this.currentBet = 0.0;
        this.communityCards = [];
        this.currentRound = 'preflop';
        this.actionOn = -1;
        this.sidePots = [];
        this.handNumber = 0;
        this.waitingPlayers = [];
        this.rakeEligible = false;
        this.totalRake = 0;
        this.handRake = 0;
        this.mainPotBeforeRake = 0;
        this.sidePots = [];
        this.lastAggressiveActor = -1;
        this.playersShowingCards = [];
        this.lastRaiseAmountThisRound = 0.0;
        
        // Table configuration
        this.stakeLevel = 0;
        this.smallBlind = 0;
        this.bigBlind = 0;
        this.minBuyin = 0;
        this.maxBuyin = 0;
        
        // Game timing
        this.actionTimeout = null;
        this.actionTimeLimit = 20000; // 20 seconds (matching frontend)
        
        // Deck
        this.deck = null;
        
        console.log(`PokerGameEngine created for table ${tableId}`);
    }

    async loadFromRedis() {
        try {
            const tablePattern = `poker:table:*:${this.tableId}`;
            const tableKeys = await redisClient.keys(tablePattern);
            
            if (tableKeys.length > 0) {
                const tableData = await redisClient.get(tableKeys[0]);
                if (tableData) {
                    const gameState = JSON.parse(tableData);
                    this.deserializeGameState(gameState);
                    console.log(`Loaded game state for table ${this.tableId}`);
                    return;
                }
            }
            
            // If no existing state, initialize as waiting table
            console.log(`No existing state found for table ${this.tableId}`);
            
        } catch (error) {
            console.error(`Error loading table ${this.tableId} from Redis:`, error);
        }
    }

    async saveToRedis() {
        try {
            // Find the correct Redis key for this table
            const tablePattern = `poker:table:*:${this.tableId}`;
            const tableKeys = await redisClient.keys(tablePattern);
            
            if (tableKeys.length > 0) {
                const gameState = this.serializeGameState();
                await redisClient.setex(tableKeys[0], 7200, JSON.stringify(gameState)); // 2 hour TTL
                console.log(`Saved game state for table ${this.tableId}`);
            }
        } catch (error) {
            console.error(`Error saving table ${this.tableId} to Redis:`, error);
        }
    }

    deserializeGameState(gameState) {
        // Load table configuration
        this.stakeLevel = gameState.stakeLevel || 1;
        this.smallBlind = gameState.smallBlind || 50;
        this.bigBlind = gameState.bigBlind || 100;
        this.minBuyin = gameState.minBuyin || 2000;
        this.maxBuyin = gameState.maxBuyin || 10000;
        
        // Load players (both humans and bots)
        this.players = new Array(5).fill(null);
        if (gameState.players && Array.isArray(gameState.players)) {
            for (const [seatIndex, playerData] of gameState.players) {
                if (playerData && seatIndex >= 0 && seatIndex < 5) {
                    this.players[seatIndex] = playerData;
                }
            }
        }
        
        // Load bots
        if (gameState.bots && Array.isArray(gameState.bots)) {
            for (const [seatIndex, botData] of gameState.bots) {
                if (botData && seatIndex >= 0 && seatIndex < 5) {
                    botData.is_bot = true;
                    botData.isBot = true;
                    this.players[seatIndex] = botData;
                }
            }
        }
        
        // Load game state
        this.activeHand = gameState.gamePhase !== 'waiting';
        this.dealerPosition = gameState.dealerIndex || 0;
        this.currentPot = gameState.pot || 0;
        this.currentBet = gameState.currentBet || 0;
        this.communityCards = gameState.communityCards || [];
        this.currentRound = gameState.gamePhase || 'waiting';
        this.actionOn = gameState.currentPlayerIndex || -1;
        this.handNumber = gameState.handNumber || 0;
        this.lastRaiseAmountThisRound = gameState.lastRaiseAmountThisRound || 0;
        
        console.log(`Deserialized game state for table ${this.tableId}, phase: ${this.currentRound}`);
    }

    serializeGameState() {
        // Convert back to Redis format matching tableManager structure
        const playerEntries = [];
        const botEntries = [];
        
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i]) {
                if (this.players[i].isBot || this.players[i].is_bot) {
                    botEntries.push([i, this.players[i]]);
                } else {
                    playerEntries.push([i, this.players[i]]);
                }
            }
        }
        
        return {
            tableId: this.tableId,
            stakeLevel: this.stakeLevel,
            smallBlind: this.smallBlind,
            bigBlind: this.bigBlind,
            minBuyin: this.minBuyin,
            maxBuyin: this.maxBuyin,
            players: playerEntries,
            bots: botEntries,
            gamePhase: this.activeHand ? this.currentRound : 'waiting',
            dealerIndex: this.dealerPosition,
            pot: this.currentPot,
            currentBet: this.currentBet,
            communityCards: this.communityCards,
            currentPlayerIndex: this.actionOn,
            handNumber: this.handNumber,
            lastRaiseAmountThisRound: this.lastRaiseAmountThisRound,
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
    }

    async addPlayer(userId, username, seatIndex, buyinAmount) {
        // Validate seat availability
        if (seatIndex < 0 || seatIndex >= 5) {
            return { success: false, error: 'Invalid seat index' };
        }
        
        if (this.players[seatIndex] !== null) {
            return { success: false, error: 'Seat already occupied' };
        }
        
        // Validate buyin amount
        if (buyinAmount < this.minBuyin || buyinAmount > this.maxBuyin) {
            return { success: false, error: `Buyin must be between ${this.minBuyin} and ${this.maxBuyin}` };
        }
        
        // Create player data (matching frontend structure)
        const playerData = {
            user_id: userId,
            name: username,
            chips: buyinAmount,
            bet: 0,
            folded: false,
            sitting_out: false,
            cards: [],
            auto_post_blinds: true,
            last_action: "",
            last_action_amount: 0,
            time_bank: 30.0,
            avatar_data: {},
            is_bot: false
        };
        
        this.players[seatIndex] = playerData;
        
        // Start game if we have enough players and not currently in a hand
        if (!this.activeHand && this.countActivePlayers() >= 2) {
            // Wait a moment then start new hand
            setTimeout(() => {
                this.startNewHand();
            }, 3000);
        }
        
        await this.saveToRedis();
        
        console.log(`Player ${username} joined table ${this.tableId} at seat ${seatIndex}`);
        return { success: true, player: playerData };
    }

    async removePlayer(userId) {
        let removedSeat = -1;
        
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i] && this.players[i].user_id === userId) {
                this.players[i] = null;
                removedSeat = i;
                break;
            }
        }
        
        if (removedSeat === -1) {
            return { success: false, error: 'Player not found' };
        }
        
        // Handle active hand scenarios
        if (this.activeHand) {
            // If it was the player's turn, advance to next player
            if (this.actionOn === removedSeat) {
                await this.moveToNextPlayer();
            }
            
            // Check if we still have enough players to continue
            if (this.countActivePlayers() < 2) {
                await this.endHand();
            }
        }
        
        await this.saveToRedis();
        
        console.log(`Player removed from seat ${removedSeat} in table ${this.tableId}`);
        return { success: true };
    }

    async processAction(userId, action, amount = 0) {
        // Find player
        const playerSeat = this.findPlayerSeat(userId);
        if (playerSeat === -1) {
            return { success: false, error: 'Player not found at table' };
        }
        
        // Validate it's player's turn
        if (this.actionOn !== playerSeat) {
            return { success: false, error: 'Not your turn' };
        }
        
        if (!this.activeHand) {
            return { success: false, error: 'No active hand' };
        }
        
        const player = this.players[playerSeat];
        if (!player || player.folded) {
            return { success: false, error: 'Invalid player state' };
        }
        
        // Clear action timeout
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
        
        // Process the action
        const actionResult = await this.executeAction(playerSeat, action, amount);
        
        if (actionResult.success) {
            // Move to next player or next phase
            await this.moveToNextPlayer();
            await this.saveToRedis();
        }
        
        return actionResult;
    }

    async executeAction(seatIndex, action, amount) {
        const player = this.players[seatIndex];
        
        switch (action) {
            case 'fold':
                player.folded = true;
                player.last_action = 'fold';
                console.log(`Player ${player.name} folds`);
                return { success: true, action: { type: 'fold', player: player.name, seatIndex } };
                
            case 'check':
                if (this.currentBet > player.bet) {
                    return { success: false, error: 'Cannot check, must call or fold' };
                }
                player.last_action = 'check';
                console.log(`Player ${player.name} checks`);
                return { success: true, action: { type: 'check', player: player.name, seatIndex } };
                
            case 'call':
                const callAmount = this.currentBet - player.bet;
                if (callAmount > player.chips) {
                    // All-in call
                    this.currentPot += player.chips;
                    player.bet += player.chips;
                    player.chips = 0;
                    player.last_action = 'all-in';
                } else {
                    this.currentPot += callAmount;
                    player.chips -= callAmount;
                    player.bet += callAmount;
                    player.last_action = callAmount === 0 ? 'check' : 'call';
                }
                console.log(`Player ${player.name} ${player.last_action} ${callAmount}`);
                return { success: true, action: { type: player.last_action, amount: callAmount, player: player.name, seatIndex } };
                
            case 'raise':
                const raiseAmount = amount - this.currentBet;
                const totalNeeded = amount - player.bet;
                
                if (totalNeeded > player.chips) {
                    return { success: false, error: 'Insufficient chips' };
                }
                
                if (raiseAmount < this.bigBlind && player.chips > totalNeeded) {
                    return { success: false, error: 'Minimum raise is one big blind' };
                }
                
                this.currentPot += totalNeeded;
                player.chips -= totalNeeded;
                player.bet = amount;
                this.currentBet = amount;
                this.lastRaiseAmountThisRound = raiseAmount;
                this.lastAggressiveActor = seatIndex;
                
                if (player.chips === 0) {
                    player.last_action = 'all-in';
                } else {
                    player.last_action = `raise ${raiseAmount}`;
                }
                
                console.log(`Player ${player.name} raises to ${amount} (raise of ${raiseAmount})`);
                return { success: true, action: { type: 'raise', amount: amount, raiseAmount, player: player.name, seatIndex } };
                
            default:
                return { success: false, error: 'Invalid action' };
        }
    }

    async moveToNextPlayer() {
        const activePlayers = this.getActivePlayers();
        
        // Check if only one player left
        if (activePlayers.length <= 1) {
            await this.endHand();
            return;
        }
        
        // Check if betting round is complete
        const playersNeedingToAct = activePlayers.filter(player => {
            const seatIndex = this.findPlayerSeat(player.user_id);
            return player.bet < this.currentBet && !player.folded && player.chips > 0;
        });
        
        if (playersNeedingToAct.length === 0) {
            await this.moveToNextPhase();
            return;
        }
        
        // Find next active player
        let nextSeat = (this.actionOn + 1) % 5;
        let attempts = 0;
        
        while (attempts < 5) {
            if (this.players[nextSeat] && !this.players[nextSeat].folded && 
                this.players[nextSeat].chips > 0 && this.players[nextSeat].bet < this.currentBet) {
                this.actionOn = nextSeat;
                this.startActionTimer();
                
                // If it's a bot's turn, handle bot decision
                if (this.players[nextSeat].is_bot) {
                    await this.handleBotAction(nextSeat);
                }
                
                return;
            }
            nextSeat = (nextSeat + 1) % 5;
            attempts++;
        }
        
        // If no valid next player found, move to next phase
        await this.moveToNextPhase();
    }

    async moveToNextPhase() {
        // Reset bets for next round
        for (const player of this.players) {
            if (player) {
                player.bet = 0;
            }
        }
        this.currentBet = 0;
        this.lastRaiseAmountThisRound = 0;
        
        switch (this.currentRound) {
            case 'preflop':
                this.currentRound = 'flop';
                this.dealCommunityCards(3);
                this.rakeEligible = true; // Flop reached
                break;
            case 'flop':
                this.currentRound = 'turn';
                this.dealCommunityCards(1);
                break;
            case 'turn':
                this.currentRound = 'river';
                this.dealCommunityCards(1);
                break;
            case 'river':
                await this.showdown();
                return;
        }
        
        // Set first player to act (first active player after dealer)
        this.setFirstPlayerToAct();
        this.startActionTimer();
        
        // If first player is bot, handle bot action
        if (this.actionOn !== -1 && this.players[this.actionOn] && this.players[this.actionOn].is_bot) {
            await this.handleBotAction(this.actionOn);
        }
    }

    startActionTimer() {
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
        }
        
        this.actionTimeout = setTimeout(async () => {
            // Auto-fold the player if they timeout
            const currentPlayer = this.players[this.actionOn];
            if (currentPlayer && !currentPlayer.folded) {
                console.log(`Player ${currentPlayer.name} timed out, auto-folding`);
                
                if (currentPlayer.is_bot) {
                    // This shouldn't happen for bots, but handle it
                    await this.executeAction(this.actionOn, 'fold', 0);
                    await this.moveToNextPlayer();
                } else {
                    // Auto-fold human player
                    await this.executeAction(this.actionOn, 'fold', 0);
                    await this.moveToNextPlayer();
                }
                
                await this.saveToRedis();
            }
        }, this.actionTimeLimit);
    }

    async handleBotAction(seatIndex) {
        const bot = this.players[seatIndex];
        if (!bot || !bot.is_bot) return;
        
        // Create bot instance for decision making
        const botPlayer = new BotPlayer(seatIndex, this.tableId, bot.chips);
        
        // Get current game state for bot decision
        const gameState = await this.getGameState();
        const decision = botPlayer.makeDecision(gameState);
        
        // Calculate think time
        const thinkTime = botPlayer.getThinkTime(decision.action, decision.amount || 0);
        
        console.log(`Bot ${bot.name} will ${decision.action} in ${thinkTime.toFixed(1)}s`);
        
        // Schedule bot action
        setTimeout(async () => {
            if (this.actionOn === seatIndex && !bot.folded) {
                await this.executeAction(seatIndex, decision.action, decision.amount || 0);
                await this.moveToNextPlayer();
                await this.saveToRedis();
            }
        }, thinkTime * 1000);
    }

    startNewHand() {
        if (this.countActivePlayers() < 2) {
            this.activeHand = false;
            this.currentRound = 'waiting';
            return;
        }
        
        console.log(`Starting new hand ${this.handNumber + 1} at table ${this.tableId}`);
        
        this.handNumber++;
        this.activeHand = true;
        this.currentRound = 'preflop';
        this.deck = new PokerDeck();
        this.deck.shuffle();
        this.communityCards = [];
        this.currentPot = 0;
        this.currentBet = this.bigBlind;
        this.rakeEligible = false;
        this.handRake = 0;
        this.playersShowingCards = [];
        this.lastRaiseAmountThisRound = 0;
        
        // Reset all players for new hand
        for (const player of this.players) {
            if (player) {
                player.cards = [];
                player.bet = 0;
                player.folded = false;
                player.last_action = '';
                player.last_action_amount = 0;
            }
        }
        
        // Set positions
        this.setPositions();
        
        // Post blinds
        this.postBlinds();
        
        // Deal hole cards
        this.dealHoleCards();
        
        // Set first player to act
        this.setFirstPlayerToAct();
        
        // Start action timer
        this.startActionTimer();
        
        // If first player is bot, handle bot action
        if (this.actionOn !== -1 && this.players[this.actionOn] && this.players[this.actionOn].is_bot) {
            this.handleBotAction(this.actionOn);
        }
    }

    setPositions() {
        const activePlayers = this.getActivePlayerSeats();
        if (activePlayers.length >= 2) {
            // Rotate dealer position
            this.dealerPosition = activePlayers[this.handNumber % activePlayers.length];
        }
    }

    postBlinds() {
        const activePlayers = this.getActivePlayerSeats();
        if (activePlayers.length < 2) return;
        
        const dealerIndex = activePlayers.indexOf(this.dealerPosition);
        const sbIndex = activePlayers[(dealerIndex + 1) % activePlayers.length];
        const bbIndex = activePlayers[(dealerIndex + 2) % activePlayers.length];
        
        // Small blind
        const sbPlayer = this.players[sbIndex];
        if (sbPlayer) {
            const sbAmount = Math.min(this.smallBlind, sbPlayer.chips);
            sbPlayer.chips -= sbAmount;
            sbPlayer.bet = sbAmount;
            this.currentPot += sbAmount;
            sbPlayer.last_action = `small blind ${sbAmount}`;
        }
        
        // Big blind
        const bbPlayer = this.players[bbIndex];
        if (bbPlayer) {
            const bbAmount = Math.min(this.bigBlind, bbPlayer.chips);
            bbPlayer.chips -= bbAmount;
            bbPlayer.bet = bbAmount;
            this.currentPot += bbAmount;
            bbPlayer.last_action = `big blind ${bbAmount}`;
        }
    }

    dealHoleCards() {
        const activePlayers = this.getActivePlayerSeats();
        
        // Deal 2 cards to each active player
        for (let cardNum = 0; cardNum < 2; cardNum++) {
            for (const seatIndex of activePlayers) {
                const player = this.players[seatIndex];
                if (player) {
                    player.cards.push(this.deck.deal());
                }
            }
        }
    }

    dealCommunityCards(count) {
        for (let i = 0; i < count; i++) {
            this.communityCards.push(this.deck.deal());
        }
        console.log(`Dealt ${count} community cards, total: ${this.communityCards.length}`);
    }

    setFirstPlayerToAct() {
        const activePlayers = this.getActivePlayerSeats();
        
        if (this.currentRound === 'preflop') {
            // First to act is player after big blind
            const dealerIndex = activePlayers.indexOf(this.dealerPosition);
            const bbIndex = activePlayers[(dealerIndex + 2) % activePlayers.length];
            const firstActorIndex = (bbIndex + 1) % activePlayers.length;
            this.actionOn = activePlayers[firstActorIndex];
        } else {
            // Post-flop, first to act is first active player after dealer
            const dealerIndex = activePlayers.indexOf(this.dealerPosition);
            let nextIndex = (dealerIndex + 1) % activePlayers.length;
            
            // Find first non-folded, non-all-in player
            for (let i = 0; i < activePlayers.length; i++) {
                const seatIndex = activePlayers[nextIndex];
                const player = this.players[seatIndex];
                if (player && !player.folded && player.chips > 0) {
                    this.actionOn = seatIndex;
                    break;
                }
                nextIndex = (nextIndex + 1) % activePlayers.length;
            }
        }
    }

    async showdown() {
        this.currentRound = 'showdown';
        this.actionOn = -1;
        
        const activePlayers = this.getActivePlayers();
        const winners = this.determineWinners(activePlayers);
        
        // Calculate rake (10% matching frontend)
        let rake = 0;
        if (this.rakeEligible && this.currentPot > 0) {
            rake = Math.floor(this.currentPot * 0.1);
            this.handRake = rake;
            this.totalRake += rake;
        }
        
        // Distribute pot after rake
        const potAfterRake = this.currentPot - rake;
        const winAmount = Math.floor(potAfterRake / winners.length);
        
        for (const winner of winners) {
            winner.chips += winAmount;
        }
        
        // Broadcast showdown results
        const winnerInfo = {
            winner_index: this.findPlayerSeat(winners[0].user_id),
            hand_description: this.getHandDescription(winners[0]),
            pot_amount: potAfterRake,
            rake: rake
        };
        
        console.log(`Hand ${this.handNumber} complete. Winner: ${winners[0].name}, pot: ${potAfterRake}`);
        
        // Schedule next hand
        setTimeout(() => {
            this.startNewHand();
        }, 5000);
        
        return winnerInfo;
    }

    determineWinners(players) {
        if (players.length === 1) {
            return players;
        }
        
        let bestHandValue = -1;
        let winners = [];
        
        for (const player of players) {
            const handInfo = HandEvaluator.evaluateHand(player.cards, this.communityCards);
            const handValue = this.getHandValue(handInfo);
            
            if (handValue > bestHandValue) {
                bestHandValue = handValue;
                winners = [player];
            } else if (handValue === bestHandValue) {
                winners.push(player);
            }
        }
        
        return winners;
    }

    getHandValue(handInfo) {
        // Convert hand rank and values to comparable number
        return handInfo.rank * 100000 + (handInfo.values[0] || 0) * 1000 + (handInfo.values[1] || 0);
    }

    getHandDescription(player) {
        const handInfo = HandEvaluator.evaluateHand(player.cards, this.communityCards);
        return HandEvaluator.handRankToString(handInfo);
    }

    async endHand() {
        this.activeHand = false;
        this.currentRound = 'waiting';
        this.actionOn = -1;
        
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
        
        // Award pot to remaining player
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length === 1) {
            activePlayers[0].chips += this.currentPot;
            
            console.log(`Hand ended early. ${activePlayers[0].name} wins ${this.currentPot}`);
            
            // Schedule next hand
            setTimeout(() => {
                this.startNewHand();
            }, 3000);
        }
        
        await this.saveToRedis();
    }

    async handlePlayerDisconnect(userId) {
        const playerSeat = this.findPlayerSeat(userId);
        if (playerSeat !== -1) {
            const player = this.players[playerSeat];
            if (player) {
                player.sitting_out = true;
                
                // If it's their turn and hand is active, auto-fold
                if (this.activeHand && this.actionOn === playerSeat) {
                    await this.executeAction(playerSeat, 'fold', 0);
                    await this.moveToNextPlayer();
                }
            }
        }
    }

    // Utility methods
    countActivePlayers() {
        return this.players.filter(p => p !== null).length;
    }

    getActivePlayers() {
        return this.players.filter(p => p !== null && !p.folded);
    }

    getActivePlayerSeats() {
        const seats = [];
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i] !== null) {
                seats.push(i);
            }
        }
        return seats.sort((a, b) => a - b);
    }

    findPlayerSeat(userId) {
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i] && this.players[i].user_id === userId) {
                return i;
            }
        }
        return -1;
    }

    async getGameState() {
        return {
            tableId: this.tableId,
            stakeLevel: this.stakeLevel,
            gamePhase: this.currentRound,
            active_hand: this.activeHand,
            players: this.players.map((player, index) => {
                if (!player) return null;
                return {
                    ...player,
                    seatIndex: index
                };
            }),
            dealer_position: this.dealerPosition,
            current_pot: this.currentPot,
            current_bet: this.currentBet,
            community_cards: this.communityCards,
            action_on: this.actionOn,
            hand_number: this.handNumber,
            last_raise_amount_this_round: this.lastRaiseAmountThisRound,
            rake_eligible: this.rakeEligible,
            total_rake: this.totalRake,
            hand_rake: this.handRake
        };
    }
}

module.exports = PokerGameEngine;
