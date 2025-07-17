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
        
        // Bot action tracking
        this.pendingBotActions = new Map();
        
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
        this.minBuyin = gameState.minBuyin || 500;
        this.maxBuyin = gameState.maxBuyin || 1000;
        
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
            console.log(`Loading ${gameState.bots.length} bots from Redis`);
            for (const [seatIndex, botData] of gameState.bots) {
                if (botData && seatIndex >= 0 && seatIndex < 5) {
                    const chipAmount = botData.chips || this.maxBuyin;
                    console.log(`Loading bot ${botData.username} with ${chipAmount} chips at seat ${seatIndex}`);
                    // Ensure consistent bot data structure - fixed duplicate field
                    const normalizedBotData = {
                        userId: botData.userId,          // Primary field
                        user_id: botData.userId,         // Compatibility field
                        name: botData.username,
                        username: botData.username,
                        chips: chipAmount,               // Ensure this is never null
                        bet: 0,
                        folded: false,
                        sitting_out: false,
                        cards: [],
                        auto_post_blinds: true,
                        last_action: "",
                        last_action_amount: 0,
                        time_bank: 30.0,
                        avatar_data: {},
                        is_bot: true,
                        isBot: true, // Keep both for compatibility
                        seatIndex: seatIndex
                    };
                    this.players[seatIndex] = normalizedBotData;
                }
            }
        }
        
        // Load game state
        this.activeHand = gameState.gamePhase !== 'waiting';
        this.dealerPosition = gameState.dealerIndex || gameState.dealer_position || 0;
        this.currentPot = gameState.pot || gameState.current_pot || 0;
        this.currentBet = gameState.currentBet || gameState.current_bet || 0;
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
            userId: userId,      // Frontend field name
            user_id: userId,
            name: username,
            username: username,
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
            is_bot: false,
            isBot: false,
            seatIndex: seatIndex
        };
        
        this.players[seatIndex] = playerData;
        
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
        console.log(`🎮 Processing action: ${action} by seat ${playerSeat} (${player.name}) for amount ${amount}`);
        const actionResult = await this.executeAction(playerSeat, action, amount);
        
        if (actionResult.success) {
            console.log(`✅ Action successful, moving to next player...`);
            // Move to next player or next phase
            await this.moveToNextPlayer();
            await this.saveToRedis();
        } else {
            console.log(`❌ Action failed: ${actionResult.error}`);
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
                
                // CRITICAL: Clear action from folded player immediately to prevent stuck scenarios
                if (this.actionOn === seatIndex) {
                    console.log(`🔧 Player ${player.name} folded and had action, clearing actionOn`);
                    this.actionOn = -1; // Will be set properly in moveToNextPlayer()
                }
                
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
                    // Correct terminology: bet vs raise
                    if (this.currentBet === 0 || this.currentBet === this.bigBlind) {
                        player.last_action = `bet ${amount}`;
                    } else {
                        player.last_action = `raise ${raiseAmount}`;
                    }
                }
                
                console.log(`Player ${player.name} raises to ${amount} (raise of ${raiseAmount})`);
                return { success: true, action: { type: 'raise', amount: amount, raiseAmount, player: player.name, seatIndex } };
                
            default:
                return { success: false, error: 'Invalid action' };
        }
    }

    // CRITICAL FIX: Completely rewritten moveToNextPlayer() method
    async moveToNextPlayer() {
        const activePlayers = this.getActivePlayers();
        
        console.log(`🎯 moveToNextPlayer: Current action on seat ${this.actionOn}, ${activePlayers.length} active players`);
        console.log(`   Current bet: ${this.currentBet}, Last aggressive actor: ${this.lastAggressiveActor}`);
        
        // PRIORITY CHECK: If action is currently on a folded player, this is a critical error
        if (this.actionOn !== -1 && this.players[this.actionOn] && this.players[this.actionOn].folded) {
            console.log(`🚨 CRITICAL BUG: moveToNextPlayer called with action on FOLDED player at seat ${this.actionOn}!`);
            console.log(`   Player ${this.players[this.actionOn].name} is folded but still has action`);
            
            // Clear the action and find next player
            this.actionOn = -1;
        }
        
        // HANDLE: If actionOn is -1 (no current action), we need to find the next player to act
        if (this.actionOn === -1) {
            console.log(`🔍 Finding next player to act (actionOn was -1)`);
            
            // Start from dealer and find first player who needs to act
            for (let i = 0; i < 5; i++) {
                const checkSeat = (this.dealerPosition + 1 + i) % 5;
                if (this.players[checkSeat] && !this.players[checkSeat].folded && this.players[checkSeat].chips > 0) {
                    // Check if this player needs to act based on current betting situation
                    const player = this.players[checkSeat];
                    const needsToAct = player.bet < this.currentBet || 
                                     (this.lastAggressiveActor !== -1 && checkSeat === this.lastAggressiveActor && player.bet >= this.currentBet);
                    
                    if (needsToAct) {
                        console.log(`   🎯 Found next player: seat ${checkSeat} (${player.name})`);
                        this.actionOn = checkSeat;
                        break;
                    }
                }
            }
        }
        
        // Check if only one non-folded player left
        const nonFoldedPlayers = this.players.filter(p => p !== null && !p.folded);
        if (nonFoldedPlayers.length <= 1) {
            console.log(`🏁 Only ${nonFoldedPlayers.length} non-folded player(s) left, ending hand`);
            await this.endHand();
            return;
        }
        
        // Also check active players (for other scenarios)
        if (activePlayers.length <= 1) {
            console.log('🏁 Only one active player left, ending hand');
            await this.endHand();
            return;
        }
        
        // CRITICAL FIX: Determine if betting round is complete
        // A betting round is complete when:
        // 1. All non-folded players have acted at least once
        // 2. All non-folded players have matched the current bet (or are all-in)
        // 3. No player has raised since the last time everyone acted
        
        let bettingRoundComplete = true;
        let nextSeat = -1;
        const seats = [];
        
        // Build list of all seats with active players
        for (let i = 0; i < 5; i++) {
            if (this.players[i] && !this.players[i].folded) {
                seats.push(i);
            }
        }
        
        console.log(`🎰 Active seats: [${seats.join(', ')}]`);
        
        // If there was an aggressive action (bet/raise), we need to give everyone a chance to respond
        if (this.lastAggressiveActor !== -1 && this.currentBet > 0) {
            console.log(`💰 There was an aggressive action from seat ${this.lastAggressiveActor} (current bet: ${this.currentBet})`);
            
            // Find the next player after current who needs to act
            let checked = 0;
            let checkSeat = (this.actionOn + 1) % 5;
            
            while (checked < 5) {
                if (this.players[checkSeat] && !this.players[checkSeat].folded) {
                    const player = this.players[checkSeat];
                    const needsToAct = player.chips > 0 && (player.bet < this.currentBet || checkSeat === this.lastAggressiveActor);
                    
                    console.log(`   Checking seat ${checkSeat} (${player.name}): bet=${player.bet}, chips=${player.chips}, needsToAct=${needsToAct}`);
                    
                    // If we've gone full circle back to the aggressor
                    if (checkSeat === this.lastAggressiveActor) {
                        if (player.bet >= this.currentBet || player.chips === 0) {
                            console.log(`   ✅ Action returned to aggressor who doesn't need to act - round complete`);
                            bettingRoundComplete = true;
                            break;
                        }
                    }
                    
                    // Found someone who needs to act
                    if (needsToAct && player.bet < this.currentBet) {
                        nextSeat = checkSeat;
                        bettingRoundComplete = false;
                        console.log(`   🎯 Found next player to act: seat ${nextSeat} (${player.name})`);
                        break;
                    }
                }
                
                checkSeat = (checkSeat + 1) % 5;
                checked++;
            }
        } else {
            // No aggressive action yet this round (everyone checking/calling)
            console.log(`☮️ No aggressive action this round (current bet: ${this.currentBet})`);
            
            // EDGE CASE FIX 1: Handle preflop big blind option
            if (this.currentRound === 'preflop' && this.currentBet === this.bigBlind) {
                // Check if big blind still needs option to raise
                const bigBlindSeat = (this.dealerPosition + 2) % 5;
                const bigBlindPlayer = this.players[bigBlindSeat];
                
                if (bigBlindPlayer && !bigBlindPlayer.folded && bigBlindPlayer.chips > 0) {
                    // Check if everyone else has called and big blind hasn't acted yet after calls
                    let allCalledBigBlind = true;
                    let bigBlindHadOption = false;
                    
                    for (let i = 0; i < 5; i++) {
                        if (i === bigBlindSeat) continue; // Skip big blind
                        const player = this.players[i];
                        if (player && !player.folded) {
                            if (player.bet < this.bigBlind) {
                                allCalledBigBlind = false;
                                break;
                            }
                        }
                    }
                    
                    // Check if we've already given big blind the option
                    // (This is a simplified check - in practice you'd track this more precisely)
                    if (allCalledBigBlind && this.actionOn !== bigBlindSeat) {
                        console.log(`🎯 Giving big blind option to raise at seat ${bigBlindSeat}`);
                        nextSeat = bigBlindSeat;
                        bettingRoundComplete = false;
                    } else if (this.actionOn === bigBlindSeat && allCalledBigBlind) {
                        console.log(`✅ Big blind has had option, preflop complete`);
                        bettingRoundComplete = true;
                    }
                }
            }
            
            // If not big blind option scenario, find next active player in order
            if (nextSeat === -1) {
                let checked = 0;
                let checkSeat = (this.actionOn + 1) % 5;
                
                while (checked < 5) {
                    if (this.players[checkSeat] && !this.players[checkSeat].folded && this.players[checkSeat].chips > 0) {
                        nextSeat = checkSeat;
                        bettingRoundComplete = false;
                        console.log(`   🎯 Found next player: seat ${nextSeat} (${this.players[checkSeat].name})`);
                        break;
                    }
                    
                    checkSeat = (checkSeat + 1) % 5;
                    checked++;
                }
                
                // EDGE CASE FIX 2: Special handling for no-aggressor scenarios
                if (nextSeat === -1) {
                    // Check if everyone has acted and matched bets (all checks or calls)
                    let everyoneMatched = true;
                    let activePlayerCount = 0;
                    
                    for (let i = 0; i < 5; i++) {
                        const player = this.players[i];
                        if (player && !player.folded) {
                            activePlayerCount++;
                            if (player.chips > 0 && player.bet < this.currentBet) {
                                everyoneMatched = false;
                                break;
                            }
                        }
                    }
                    
                    if (everyoneMatched && activePlayerCount > 1) {
                        console.log(`   ✅ All players matched current bet (${this.currentBet}) - round complete`);
                        bettingRoundComplete = true;
                    } else if (activePlayerCount <= 1) {
                        console.log(`   ✅ Only ${activePlayerCount} active player(s) left - round complete`);
                        bettingRoundComplete = true;
                    } else {
                        console.log(`   ❌ No more players to act but bets don't match - emergency round completion`);
                        bettingRoundComplete = true;
                    }
                }
            }
        }
        
        // CRITICAL: Handle if action is stuck on folded player
        if (this.actionOn !== -1) {
            const currentPlayer = this.players[this.actionOn];
            if (currentPlayer && currentPlayer.folded) {
                console.log(`🚨 CRITICAL: Action stuck on folded player at seat ${this.actionOn}!`);
                
                // EMERGENCY: Find next active player immediately
                for (let i = 1; i < 5; i++) {
                    const checkSeat = (this.actionOn + i) % 5;
                    if (this.players[checkSeat] && !this.players[checkSeat].folded && this.players[checkSeat].chips > 0) {
                        nextSeat = checkSeat;
                        bettingRoundComplete = false;
                        console.log(`   🔧 EMERGENCY: Moving action from folded seat ${this.actionOn} to active seat ${nextSeat}`);
                        break;
                    }
                }
                
                // If we still can't find anyone, check if round should complete
                if (nextSeat === -1) {
                    console.log(`   🏁 EMERGENCY: No active players found, completing betting round`);
                    bettingRoundComplete = true;
                }
            }
        }
        
        if (bettingRoundComplete) {
            console.log('🏁 Betting round complete, moving to next phase');
            await this.moveToNextPhase();
            return;
        }
        
        // We already found nextSeat above, now set it
        if (nextSeat === -1) {
            console.log('🚨 CRITICAL ERROR: No next player found but betting round not complete!');
            console.log(`   Current state: actionOn=${this.actionOn}, currentBet=${this.currentBet}, round=${this.currentRound}`);
            
            // Emergency fallback: move to next phase
            await this.moveToNextPhase();
            return;
        }
        
        // Move action to next player
        console.log(`🎯 Action moving from seat ${this.actionOn} to seat ${nextSeat}`);
        this.actionOn = nextSeat;
        
        // Clear any existing timeout
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
        
        this.startActionTimer();
        
        // If it's a bot's turn, handle bot decision
        const nextPlayer = this.players[nextSeat];
        if (nextPlayer && (nextPlayer.is_bot || nextPlayer.isBot)) {
            console.log(`🤖 Next player is bot ${nextPlayer.name} at seat ${nextSeat}`);
            setTimeout(() => {
                this.handleBotAction(nextSeat);
            }, 100);
        } else {
            console.log(`👤 Next player is human ${nextPlayer ? nextPlayer.name : 'Unknown'} at seat ${nextSeat}`);
        }
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
        this.lastAggressiveActor = -1; // Reset for new betting round
        
        console.log(`📍 Starting new betting round: ${this.currentRound}`);
        
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
        
        // Clear existing timeout
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
        
        this.startActionTimer();
        
        // If first player is bot, handle bot action
        if (this.actionOn !== -1 && this.players[this.actionOn] && 
            (this.players[this.actionOn].is_bot || this.players[this.actionOn].isBot)) {
            setTimeout(() => {
                this.handleBotAction(this.actionOn);
            }, 100);
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
                
                // Auto-fold both humans and bots on timeout
                await this.executeAction(this.actionOn, 'fold', 0);
                await this.moveToNextPlayer();
                await this.saveToRedis();
            }
        }, this.actionTimeLimit);
    }

    async handleBotAction(seatIndex) {
        const bot = this.players[seatIndex];
        if (!bot || (!bot.is_bot && !bot.isBot)) {
            console.log(`No bot found at seat ${seatIndex} or not a bot`);
            return;
        }
        
        // Validate bot is still supposed to act
        if (this.actionOn !== seatIndex || bot.folded || bot.chips <= 0) {
            console.log(`Bot ${bot.name} no longer needs to act - actionOn: ${this.actionOn}, folded: ${bot.folded}, chips: ${bot.chips}`);
            return;
        }
        
        console.log(`Bot ${bot.name} making decision for ${this.currentRound} round`);
        
        // Create bot instance for decision making
        const botPlayer = new BotPlayer(seatIndex, this.tableId, bot.chips);
        
        // Get current game state for bot decision
        const gameState = await this.getGameState();
        
        // Add debugging info
        console.log(`Bot decision input: actionOn=${gameState.action_on}, currentRound=${gameState.gamePhase}, currentBet=${gameState.current_bet}`);
        
        let decision;
        try {
            decision = botPlayer.makeDecision(gameState);
            console.log(`Bot ${bot.name} decision: ${decision.action}, amount: ${decision.amount || 0}`);
        } catch (error) {
            console.error(`Bot ${bot.name} decision error:`, error);
            decision = { action: 'fold', amount: 0 };
        }
        
        // Validate decision
        if (!['fold', 'check', 'call', 'raise'].includes(decision.action)) {
            console.error(`Invalid bot action: ${decision.action}, folding instead`);
            decision = { action: 'fold', amount: 0 };
        }
        
        // Calculate think time (shortened for testing)
        const thinkTime = Math.min(botPlayer.getThinkTime(decision.action, decision.amount || 0), 2.0);
        
        console.log(`Bot ${bot.name} will ${decision.action} in ${thinkTime.toFixed(1)}s`);
        
        // Store the bot action for timeout validation
        const actionId = `${seatIndex}_${Date.now()}`;
        this.pendingBotActions.set(actionId, {
            seatIndex,
            action: decision.action,
            amount: decision.amount || 0,
            gamePhase: this.currentRound,
            actionOn: this.actionOn
        });
        
        // Schedule bot action
        setTimeout(async () => {
            const pendingAction = this.pendingBotActions.get(actionId);
            if (!pendingAction) {
                console.log(`Bot action ${actionId} was cancelled`);
                return;
            }
            
            // Validate game state hasn't changed
            if (this.actionOn !== seatIndex || 
                this.currentRound !== pendingAction.gamePhase || 
                bot.folded) {
                console.log(`Game state changed, cancelling bot action for ${bot.name}`);
                this.pendingBotActions.delete(actionId);
                return;
            }
            
            try {
                console.log(`Executing bot action: ${bot.name} ${pendingAction.action} ${pendingAction.amount}`);
                await this.executeAction(seatIndex, pendingAction.action, pendingAction.amount);
                
                // Broadcast the action result to all players
                if (this.websocketServer) {
                    const gameState = await this.getGameState();
                    await this.websocketServer.broadcastToTable(this.tableId, {
                        type: 'game_state',
                        data: {
                            event: 'player_action',
                            action: {
                                type: pendingAction.action,
                                amount: pendingAction.amount,
                                seatIndex: seatIndex
                            },
                            gameState: gameState
                        }
                    });
                }
                
                await this.moveToNextPlayer();
                await this.saveToRedis();
            } catch (error) {
                console.error(`Error executing bot action:`, error);
                // Force fold on error
                await this.executeAction(seatIndex, 'fold', 0);
                await this.moveToNextPlayer();
                await this.saveToRedis();
            }
            
            this.pendingBotActions.delete(actionId);
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
        
        // Reset all players for new hand - CRITICAL FIX
        for (const player of this.players) {
            if (player) {
                player.cards = []; // Clear old cards
                player.bet = 0;
                player.folded = false;
                player.last_action = '';
                player.last_action_amount = 0;
                console.log(`Reset player ${player.name} for new hand`);
            }
        }
        
        // Set positions
        this.setPositions();
        
        // Post blinds
        this.postBlinds();
        
        // Deal hole cards - CRITICAL FIX
        this.dealHoleCards();
        
        // Log cards to verify they were dealt
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            if (player && player.cards.length > 0) {
                console.log(`Player ${player.name} at seat ${i} dealt: ${player.cards.map(c => c.rank + c.suit).join(', ')}`);
            }
        }
        
        // Set first player to act
        this.setFirstPlayerToAct();
        
        // Clear existing timeout
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
        
        // Start action timer
        this.startActionTimer();
        
        // Broadcast hand started event with new cards
        if (this.websocketServer) {
            const gameState = this.getGameState();
            this.websocketServer.broadcastToTable(this.tableId, {
                type: 'game_state',
                data: {
                    event: 'hand_started',
                    gameState: gameState
                }
            });
        }
        
        // If first player is bot, handle bot action
        if (this.actionOn !== -1 && this.players[this.actionOn] && 
            (this.players[this.actionOn].is_bot || this.players[this.actionOn].isBot)) {
            setTimeout(() => {
                this.handleBotAction(this.actionOn);
            }, 100);
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
        
        console.log(`Dealing hole cards to ${activePlayers.length} players`);
        
        // Deal 2 cards to each active player
        for (let cardNum = 0; cardNum < 2; cardNum++) {
            for (const seatIndex of activePlayers) {
                const player = this.players[seatIndex];
                if (player) {
                    const card = this.deck.deal();
                    player.cards.push(card);
                    console.log(`Dealt ${card.rank}${card.suit} to ${player.name} at seat ${seatIndex}`);
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
        
        console.log(`🎯 setFirstPlayerToAct: ${this.currentRound} round, ${activePlayers.length} active players: [${activePlayers.join(', ')}]`);
        
        if (activePlayers.length === 0) {
            console.log('❌ No active players found, setting actionOn = -1');
            this.actionOn = -1;
            return;
        }
        
        if (this.currentRound === 'preflop') {
            // Fix: First to act is player after big blind (UTG)
            const dealerIndex = activePlayers.indexOf(this.dealerPosition);
            
            if (activePlayers.length === 2) {
                // Heads up: dealer acts first preflop
                this.actionOn = this.dealerPosition;
                console.log(`🎯 Heads up preflop: Dealer (seat ${this.dealerPosition}) acts first`);
            } else {
                // 3+ players: action starts after big blind
                const bbIndex = (dealerIndex + 2) % activePlayers.length;
                const firstActorIndex = (bbIndex + 1) % activePlayers.length;
                this.actionOn = activePlayers[firstActorIndex];
                console.log(`🎯 Multi-player preflop: UTG (seat ${this.actionOn}) acts first`);
            }

            console.log(`Turn order: Dealer=${this.dealerPosition}, First to act=${this.actionOn}`);
        } else {
            // Post-flop, first to act is first active player after dealer
            const dealerIndex = activePlayers.indexOf(this.dealerPosition);
            console.log(`🎯 Post-flop: Looking for first player after dealer (seat ${this.dealerPosition})`);
            
            // Track attempts to prevent infinite loops
            let attempts = 0;
            let nextIndex = (dealerIndex + 1) % activePlayers.length;
            
            // Find first non-folded, non-all-in player
            while (attempts < activePlayers.length) {
                const seatIndex = activePlayers[nextIndex];
                const player = this.players[seatIndex];
                
                console.log(`🔍 Checking seat ${seatIndex}: player=${player ? player.name : 'null'}, folded=${player ? player.folded : 'n/a'}, chips=${player ? player.chips : 'n/a'}`);
                
                if (player && !player.folded && player.chips > 0) {
                    this.actionOn = seatIndex;
                    console.log(`✅ Found first player to act: seat ${seatIndex} (${player.name})`);
                    return;
                }
                
                nextIndex = (nextIndex + 1) % activePlayers.length;
                attempts++;
            }
            
            // CRITICAL FIX: Enhanced fallback logic
            console.log('⚠️ No valid post-flop player found, checking for any non-folded players...');
            
            // Look for ANY non-folded player (even if all-in)
            for (const seatIndex of activePlayers) {
                const player = this.players[seatIndex];
                if (player && !player.folded) {
                    this.actionOn = seatIndex;
                    console.log(`🔧 Fallback: Found non-folded player at seat ${seatIndex} (${player.name})`);
                    return;
                }
            }
            
            // Final fallback: Check if we should end the hand
            const nonFoldedPlayers = activePlayers.filter(seatIndex => {
                const player = this.players[seatIndex];
                return player && !player.folded;
            });
            
            if (nonFoldedPlayers.length <= 1) {
                console.log('🏁 Only one or no non-folded players remaining, ending hand');
                this.actionOn = -1;
                // Schedule hand end
                setTimeout(() => {
                    this.endHand();
                }, 100);
                return;
            }
            
            // If we reach here, something is wrong - force end hand
            console.log('🚨 CRITICAL: setFirstPlayerToAct failed to find valid player, forcing hand end');
            this.actionOn = -1;
            setTimeout(() => {
                this.endHand();
            }, 100);
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
        let count = 0;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i] !== null && !this.players[i].sitting_out) {
                count++;
            }
        }
        console.log(`PokerGameEngine: Counted ${count} active players at table ${this.tableId}`);
        return count;
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
            if (this.players[i] && (this.players[i].user_id === userId || this.players[i].userId === userId)) {
                return i;
            }
        }
        return -1;
    }

    getBettingLimits() {
        if (this.actionOn === -1) return {};
        
        const player = this.players[this.actionOn];
        if (!player) return {};
        
        const callAmount = this.currentBet - player.bet;
        const minRaise = this.currentBet + this.bigBlind;
        const maxBet = player.chips + player.bet;
        
        return {
            min_bet: minRaise,
            max_bet: maxBet,
            default_bet: Math.min(minRaise, maxBet),
            call_amount: callAmount,
            can_check: callAmount === 0
        };
    }

    async getGameState() {
        return {
            tableId: this.tableId,
            stakeLevel: this.stakeLevel,
            stake_level: this.stakeLevel, // Add both field names for compatibility
            gamePhase: this.activeHand ? this.currentRound : 'waiting',
            current_round: this.activeHand ? this.currentRound : 'waiting', // Add both field names
            active_hand: this.activeHand,
            players: this.players.map((player, index) => {
                if (!player) return null;
                return {
                    ...player,
                    seatIndex: index,
                    chips: player.chips || 0 // Ensure chips is never null
                };
            }),
            dealer_position: this.dealerPosition,
            current_pot: this.currentPot || 0, // Ensure pot is never null
            current_bet: this.currentBet || 0,
            community_cards: this.communityCards,
            action_on: this.actionOn,
            hand_number: this.handNumber,
            last_raise_amount_this_round: this.lastRaiseAmountThisRound,
            rake_eligible: this.rakeEligible,
            total_rake: this.totalRake,
            hand_rake: this.handRake,
            betting_limits: this.getBettingLimits() // Added betting limits for frontend
        };
    }
}

module.exports = PokerGameEngine;

