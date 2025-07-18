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
        
        // Load human players from the players array (stored as [seatIndex, playerData] tuples)
        if (gameState.players && Array.isArray(gameState.players)) {
            console.log(`Loading ${gameState.players.length} human players from Redis`);
            for (const [seatIndex, playerData] of gameState.players) {
                if (playerData && seatIndex >= 0 && seatIndex < 5) {
                    this.players[seatIndex] = {
                        ...playerData,
                        seatIndex: seatIndex,
                        isBot: false,
                        had_turn_this_round: false
                    };
                    console.log(`Loaded human player ${playerData.username} at seat ${seatIndex}`);
                }
            }
        }
        
        // Load bots from the bots array (stored as [seatIndex, botData] tuples)
        if (gameState.bots && Array.isArray(gameState.bots)) {
            console.log(`Loading ${gameState.bots.length} bots from Redis`);
            for (const [seatIndex, botData] of gameState.bots) {
                if (botData && seatIndex >= 0 && seatIndex < 5) {
                    this.players[seatIndex] = {
                        ...botData,
                        seatIndex: seatIndex,
                        isBot: true,
                        had_turn_this_round: false
                    };
                    console.log(`Loaded bot ${botData.username} at seat ${seatIndex} with ${botData.chips} chips`);
                }
            }
        }
        
        // Load game state
        this.activeHand = gameState.activeHand || false;
        this.dealerPosition = gameState.dealerPosition || 0;
        this.currentPot = gameState.currentPot || 0;
        this.currentBet = gameState.currentBet || 0;
        this.communityCards = gameState.communityCards || [];
        this.currentRound = gameState.gamePhase || 'waiting';  // Note: gamePhase not currentRound in Redis
        this.actionOn = gameState.actionOn || -1;
        this.handNumber = gameState.handNumber || 0;
        this.lastRaiseAmountThisRound = gameState.lastRaiseAmountThisRound || 0;
        
        console.log(`Deserialized game state for table ${this.tableId}, phase: ${this.currentRound}`);
    }

    serializeGameState() {
        return {
            stakeLevel: this.stakeLevel,
            smallBlind: this.smallBlind,
            bigBlind: this.bigBlind,
            minBuyin: this.minBuyin,
            maxBuyin: this.maxBuyin,
            players: this.players,
            activeHand: this.activeHand,
            dealerPosition: this.dealerPosition,
            currentPot: this.currentPot,
            currentBet: this.currentBet,
            communityCards: this.communityCards,
            currentRound: this.currentRound,
            actionOn: this.actionOn,
            handNumber: this.handNumber,
            lastRaiseAmountThisRound: this.lastRaiseAmountThisRound
        };
    }

    addPlayer(playerId, username, seatIndex, chips, isBot = false) {
        if (seatIndex < 0 || seatIndex >= 5) {
            console.error(`Invalid seat index: ${seatIndex}`);
            return false;
        }

        if (this.players[seatIndex] !== null) {
            console.error(`Seat ${seatIndex} is already occupied`);
            return false;
        }

        const player = {
            userId: playerId,
            username: username,
            chips: chips,
            bet: 0,
            folded: false,
            allIn: false,
            cards: [],
            seatIndex: seatIndex,
            isBot: isBot,
            had_turn_this_round: false
        };

        this.players[seatIndex] = player;
        console.log(`Added ${isBot ? 'bot' : 'player'} ${username} to seat ${seatIndex} with ${chips} chips`);
        
        return true;
    }

    removePlayer(seatIndex) {
        if (seatIndex < 0 || seatIndex >= 5) {
            return false;
        }

        this.players[seatIndex] = null;
        console.log(`Removed player from seat ${seatIndex}`);
        return true;
    }

    getActivePlayers() {
        return this.players.filter(player => player !== null && !player.folded);
    }

    async startNewHand() {
        console.log('\n=== STARTING NEW HAND ===');
        
        // Reset game state
        this.activeHand = true;
        this.currentPot = 0;
        this.currentBet = 0;
        this.communityCards = [];
        this.currentRound = 'preflop';
        this.actionOn = -1;
        this.lastRaiseAmountThisRound = 0;
        this.lastAggressiveActor = -1;
        this.rakeEligible = false;
        this.handRake = 0;
        
        // Reset all players
        for (const player of this.players) {
            if (player) {
                player.bet = 0;
                player.folded = false;
                player.allIn = false;
                player.cards = [];
                player.had_turn_this_round = false;
            }
        }

        // Move dealer button
        this.moveDealer();
        this.handNumber++;

        // Create new deck and deal cards
        this.deck = new PokerDeck();
        this.deck.shuffle();

        // Deal two cards to each player
        for (let i = 0; i < 2; i++) {
            for (let seat = 0; seat < 5; seat++) {
                const player = this.players[seat];
                if (player && !player.folded) {
                    const card = this.deck.deal();
                    player.cards.push(card);
                }
            }
        }

        // Post blinds
        await this.postBlinds();

        // Set first action
        this.setFirstAction();

        console.log(`Hand ${this.handNumber} started. Dealer at seat ${this.dealerPosition}`);
        console.log(`Action starts with seat ${this.actionOn}`);
        
        // Broadcast initial game state
        this.broadcastGameState({ event: 'hand_started' });
        
        // Start action timer
        this.startActionTimer();
    }

    moveDealer() {
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length < 2) {
            console.log('Not enough players to move dealer');
            return;
        }

        let attempts = 0;
        do {
            this.dealerPosition = (this.dealerPosition + 1) % 5;
            attempts++;
        } while (this.players[this.dealerPosition] === null && attempts < 5);

        console.log(`Dealer button moved to seat ${this.dealerPosition}`);
    }

    async postBlinds() {
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length < 2) {
            return;
        }

        // Find small blind position (next active player after dealer)
        let sbPosition = this.findNextActivePlayer(this.dealerPosition);
        let bbPosition = this.findNextActivePlayer(sbPosition);

        // In heads-up, dealer posts small blind
        if (activePlayers.length === 2) {
            sbPosition = this.dealerPosition;
            bbPosition = this.findNextActivePlayer(this.dealerPosition);
        }

        // Post small blind
        const sbPlayer = this.players[sbPosition];
        if (sbPlayer) {
            const sbAmount = Math.min(this.smallBlind, sbPlayer.chips);
            sbPlayer.chips -= sbAmount;
            sbPlayer.bet = sbAmount;
            sbPlayer.last_action = `small blind ${sbAmount}`;
            this.currentPot += sbAmount;
            console.log(`${sbPlayer.username} posts small blind ${sbAmount}`);
        }

        // Post big blind
        const bbPlayer = this.players[bbPosition];
        if (bbPlayer) {
            const bbAmount = Math.min(this.bigBlind, bbPlayer.chips);
            bbPlayer.chips -= bbAmount;
            bbPlayer.bet = bbAmount;
            bbPlayer.last_action = `big blind ${bbAmount}`;
            this.currentPot += bbAmount;
            this.currentBet = bbAmount;
            console.log(`${bbPlayer.username} posts big blind ${bbAmount}`);
        }
    }

    setFirstAction() {
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length < 2) {
            this.actionOn = -1;
            return;
        }

        // Find first player to act (UTG - under the gun)
        let position = this.dealerPosition;
        
        // In heads-up, big blind acts first preflop
        if (activePlayers.length === 2) {
            // Find big blind position
            position = this.findNextActivePlayer(this.dealerPosition);
            position = this.findNextActivePlayer(position);
            this.actionOn = position;
            return;
        }

        // Multi-way: action starts with player after big blind
        position = this.findNextActivePlayer(position); // Small blind
        position = this.findNextActivePlayer(position); // Big blind
        position = this.findNextActivePlayer(position); // UTG
        
        this.actionOn = position;
    }

    findNextActivePlayer(startPosition) {
        let position = (startPosition + 1) % 5;
        let attempts = 0;
        
        while (attempts < 5) {
            if (this.players[position] && !this.players[position].folded) {
                return position;
            }
            position = (position + 1) % 5;
            attempts++;
        }
        
        return -1; // No active player found
    }

    async executeAction(seatIndex, action, amount = 0) {
        const player = this.players[seatIndex];
        if (!player || player.folded) {
            return { success: false, error: 'Invalid player or player folded' };
        }

        if (this.actionOn !== seatIndex) {
            return { success: false, error: 'Not your turn' };
        }

        console.log(`Player ${player.username} attempting ${action} ${amount}`);

        switch (action) {
            case 'fold':
                player.folded = true;
                player.last_action = 'fold';
                player.had_turn_this_round = true;  // CRITICAL: Mark that player has acted
                console.log(`Player ${player.username} folds`);
                return { success: true, action: { type: 'fold', amount: 0, player: player.username, seatIndex } };

            case 'call':
                const callAmount = Math.min(this.currentBet - player.bet, player.chips);
                
                if (callAmount === 0) {
                    // Check
                    player.last_action = 'check';
                } else {
                    this.currentPot += callAmount;
                    player.chips -= callAmount;
                    player.bet += callAmount;
                    player.last_action = callAmount === 0 ? 'check' : 'call';
                }
                
                if (player.chips === 0) {
                    player.last_action = 'all-in';
                } else {
                    this.currentPot += callAmount;
                    player.chips -= callAmount;
                    player.bet += callAmount;
                    player.last_action = callAmount === 0 ? 'check' : 'call';
                }
                player.had_turn_this_round = true;  // CRITICAL: Mark that player has acted
                console.log(`Player ${player.username} ${player.last_action} ${callAmount}`);
                return { success: true, action: { type: player.last_action, amount: callAmount, player: player.username, seatIndex } };
                
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
                
                player.had_turn_this_round = true;  // CRITICAL: Mark that player has acted
                
                // CRITICAL FIX: Reset had_turn_this_round for all other players when someone raises
                // This is the key missing logic that was causing betting rounds to never complete
                console.log(`🔧 CRITICAL FIX: Resetting had_turn_this_round for all players except ${player.username} due to raise`);
                for (let i = 0; i < this.players.length; i++) {
                    const otherPlayer = this.players[i];
                    if (otherPlayer && !otherPlayer.folded && i !== seatIndex) {
                        console.log(`   Resetting had_turn_this_round for ${otherPlayer.username} (seat ${i})`);
                        otherPlayer.had_turn_this_round = false;
                    }
                }
                
                console.log(`Player ${player.username} raises to ${amount} (raise of ${raiseAmount})`);
                return { success: true, action: { type: 'raise', amount: amount, raiseAmount, player: player.username, seatIndex } };
                
            default:
                return { success: false, error: 'Invalid action' };
        }
    }

    // CRITICAL FIX: Completely rewritten moveToNextPlayer() method with had_turn_this_round tracking
    async moveToNextPlayer() {
        const activePlayers = this.getActivePlayers();
        
        console.log(`🎯 moveToNextPlayer: Current action on seat ${this.actionOn}, ${activePlayers.length} active players`);
        console.log(`   Current state: currentBet=${this.currentBet}, currentRound=${this.currentRound}, actionOn=${this.actionOn}`);
        
        // PRIORITY CHECK: If action is currently on a folded player, this is a critical error
        if (this.actionOn !== -1 && this.players[this.actionOn] && this.players[this.actionOn].folded) {
            console.log(`🚨 CRITICAL BUG: moveToNextPlayer called with action on FOLDED player at seat ${this.actionOn}!`);
            console.log(`   Player ${this.players[this.actionOn].name} is folded but still has action`);
            
            // Clear the action and find next player
            this.actionOn = -1;
        }
        
        // Check if only one non-folded player left
        const nonFoldedPlayers = this.players.filter(p => p !== null && !p.folded);
        if (nonFoldedPlayers.length <= 1) {
            console.log(`🏁 Only ${nonFoldedPlayers.length} non-folded player(s) left, ending hand`);
            await this.endHand();
            return;
        }
        
        // CRITICAL: Use had_turn_this_round tracking to determine round completion
        console.log(`📊 Checking betting round completion with had_turn_this_round tracking...`);
        
        let bettingRoundComplete = true;
        let nextSeat = -1;
        let highestBet = this.currentBet;
        let activePlayerCount = 0;
        let activeNonAllInCount = 0;
        
        // Log current player states for debugging
        for (let i = 0; i < 5; i++) {
            const player = this.players[i];
            if (player && !player.folded) {
                activePlayerCount++;
                if (player.chips > 0) activeNonAllInCount++;
                console.log(`   Seat ${i} (${player.username}): bet=${player.bet}, chips=${player.chips}, had_turn=${player.had_turn_this_round}`);
            } else if (player === null) {
                console.log(`   Seat ${i}: EMPTY SEAT`);
            } else if (player && player.folded) {
                console.log(`   Seat ${i} (${player.username}): FOLDED`);
            }
        }
        
        console.log(`   ${activePlayerCount} active players, ${activeNonAllInCount} can still act`);
        
        // CRITICAL DEBUG: Check for 4-player table issues
        if (activePlayerCount === 4) {
            console.log(`   🔍 4-PLAYER TABLE DETECTED - this might be causing the bug!`);
            console.log(`   dealerPosition=${this.dealerPosition}, actionOn=${this.actionOn}`);
        }
        
        // ENHANCED: Check if round is complete using comprehensive logic from backup
        // This handles edge cases like BB check option, all-in scenarios, etc.
        for (let i = 0; i < 5; i++) {
            const player = this.players[i];
            if (player && !player.folded) {
                // Player needs to act if they have chips AND either:
                // 1. They haven't had their turn this round (BB check option or after a raise)
                // 2. They haven't matched the highest bet yet
                // CRITICAL FIX: Check had_turn_this_round FIRST - this is the primary condition
                if (player.chips > 0 && (!player.had_turn_this_round || player.bet < highestBet)) {
                    console.log(`   🔄 Seat ${i} (${player.username}) still needs to act: had_turn=${player.had_turn_this_round}, bet=${player.bet}, highestBet=${highestBet}, chips=${player.chips}`);
                    bettingRoundComplete = false;
                    break;
                }
            }
        }
        
        // ENHANCED: Handle all-in scenarios where only one player can act
        // If only one non-all-in player remains, check if they've matched the highest bet
        console.log(`   🔍 ALL-IN SCENARIO CHECK: activeNonAllInCount=${activeNonAllInCount}, activePlayerCount=${activePlayerCount}`);
        if (activeNonAllInCount <= 1 && activePlayerCount >= 2) {
            console.log(`   ⚠️  TRIGGERING ALL-IN SCENARIO LOGIC - this might be the bug!`);
            let soleActorMatched = true;
            if (activeNonAllInCount === 1) {
                for (let i = 0; i < 5; i++) {
                    const player = this.players[i];
                    if (player && !player.folded && player.chips > 0) {
                        if (player.bet < highestBet) {
                            soleActorMatched = false;
                            console.log(`   🔄 Sole active player seat ${i} (${player.username}) needs to match bet: ${player.bet} < ${highestBet}`);
                            break;
                        }
                    }
                }
            }
            if (soleActorMatched) {
                console.log(`   🏁 All-in scenario: sole actor has matched bets, completing round`);
                bettingRoundComplete = true;
            }
        }
        
        // If round is complete, move to next phase
        if (bettingRoundComplete) {
            console.log('🏁 Betting round complete (all eligible players have acted and matched bets), moving to next phase');
            console.log(`   Final decision: bettingRoundComplete=${bettingRoundComplete}, activeNonAllInCount=${activeNonAllInCount}, activePlayerCount=${activePlayerCount}`);
            await this.moveToNextPhase();
            return;
        } else {
            console.log(`🔄 Betting round NOT complete, continuing with player actions`);
            console.log(`   Decision factors: bettingRoundComplete=${bettingRoundComplete}, activeNonAllInCount=${activeNonAllInCount}, activePlayerCount=${activePlayerCount}`);
        }
        
        // Find next player to act using the same logic as backup
        console.log(`🔍 Finding next player to act...`);
        console.log(`   Starting search from actionOn=${this.actionOn}, dealerPosition=${this.dealerPosition}`);
        
        // CRITICAL FIX: When finding next player after a raise, start from the seat after the raiser
        // but make sure to check ALL seats to find any player who needs to act
        let startSeat = this.actionOn === -1 ? this.dealerPosition : this.actionOn;
        let searchAttempts = 0;
        let checkSeat = (startSeat + 1) % 5;
        
        console.log(`   Will start checking from seat ${checkSeat} (startSeat=${startSeat})`);
        
        // ENHANCED: Check ALL seats to make sure we don't miss anyone who needs to act
        console.log(`   🔍 Checking all seats for players who need to act:`);
        for (let i = 0; i < 5; i++) {
            const player = this.players[i];
            if (player && !player.folded && player.chips > 0) {
                const needsToAct = player.bet < highestBet || !player.had_turn_this_round;
                console.log(`     Seat ${i} (${player.username}): bet=${player.bet}, had_turn=${player.had_turn_this_round}, needsToAct=${needsToAct}`);
            }
        }
        
        while (searchAttempts < 5) {
            const player = this.players[checkSeat];
            
            if (player && !player.folded && player.chips > 0) {
                // Player needs to act if they haven't matched the highest bet yet
                // OR if they haven't had their turn this round (dual condition from backup)
                const needsToAct = player.bet < highestBet || !player.had_turn_this_round;
                
                console.log(`   Checking seat ${checkSeat} (${player.username}): bet=${player.bet}, had_turn=${player.had_turn_this_round}, needsToAct=${needsToAct}`);
                
                if (needsToAct) {
                    nextSeat = checkSeat;
                    console.log(`   🎯 Found next player to act: seat ${nextSeat} (${player.username})`);
                    break;
                }
            }
            
            checkSeat = (checkSeat + 1) % 5;
            searchAttempts++;
        }
        
        // Handle edge case: if no next player found but round not complete
        if (nextSeat === -1) {
            console.log('🚨 CRITICAL: No next player found but betting round not complete!');
            console.log(`   Current state: actionOn=${this.actionOn}, currentBet=${this.currentBet}, round=${this.currentRound}`);
            
            // Check for special scenarios
            if (activeNonAllInCount <= 1) {
                console.log(`   Only ${activeNonAllInCount} non-all-in players, completing round`);
                await this.moveToNextPhase();
                return;
            }
            
            // Emergency: try to find ANY active player
            for (let i = 0; i < 5; i++) {
                const player = this.players[i];
                if (player && !player.folded && player.chips > 0) {
                    nextSeat = i;
                    console.log(`   🔧 EMERGENCY: Found active player at seat ${i} (${player.username})`);
                    break;
                }
            }
            
            // Final fallback: complete the round
            if (nextSeat === -1) {
                console.log(`   🏁 EMERGENCY: Force completing betting round`);
                await this.moveToNextPhase();
                return;
            }
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
            console.log(`🤖 Next player is bot ${nextPlayer.username} at seat ${nextSeat}`);
            setTimeout(() => {
                this.handleBotAction(nextSeat);
            }, 100);
        } else {
            console.log(`👤 Next player is human ${nextPlayer ? nextPlayer.username : 'Unknown'} at seat ${nextSeat}`);
        }
    }

    async moveToNextPhase() {
        // Reset bets for next round
        for (const player of this.players) {
            if (player) {
                player.bet = 0;
                player.had_turn_this_round = false;  // CRITICAL: Reset turn tracking for new betting round
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
                await this.endHand();
                return;
        }
        
        // Set action to first active player after dealer
        this.setPostFlopAction();
        
        // Broadcast state update
        this.broadcastGameState({ event: 'betting_round_complete' });
        
        // Start action timer
        this.startActionTimer();
    }

    setPostFlopAction() {
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length < 2) {
            this.actionOn = -1;
            return;
        }
        
        // Action starts with first active player after dealer
        let position = this.dealerPosition;
        let attempts = 0;
        
        while (attempts < 5) {
            position = (position + 1) % 5;
            if (this.players[position] && !this.players[position].folded) {
                this.actionOn = position;
                console.log(`Post-flop action starts with seat ${position}`);
                return;
            }
            attempts++;
        }
        
        this.actionOn = -1;
    }

    dealCommunityCards(count) {
        for (let i = 0; i < count; i++) {
            if (this.deck) {
                const card = this.deck.deal();
                this.communityCards.push(card);
                console.log(`Dealt community card: ${card.rank} of ${card.suit}`);
            }
        }
        
        console.log(`Community cards: ${this.communityCards.map(c => `${c.rank}${c.suit}`).join(' ')}`);
    }

    startActionTimer() {
        // Clear any existing timeout
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }

        // Only start timer if there's an active player
        if (this.actionOn !== -1 && this.players[this.actionOn]) {
            console.log(`⏰ Starting 20-second action timer for seat ${this.actionOn}`);
            
            this.actionTimeout = setTimeout(async () => {
                console.log(`⏰ Action timeout for seat ${this.actionOn}`);
                
                const player = this.players[this.actionOn];
                if (player && !player.folded) {
                    // Auto-fold the player
                    const result = await this.executeAction(this.actionOn, 'fold');
                    if (result.success) {
                        console.log(`Player ${player.username} auto-folded due to timeout`);
                        
                        // Broadcast the action
                        this.broadcastGameState({
                            event: 'player_action',
                            action: result.action
                        });
                        
                        // Move to next player
                        await this.moveToNextPlayer();
                    }
                }
            }, this.actionTimeLimit);
        }
    }

    async handleBotAction(seatIndex) {
        const player = this.players[seatIndex];
        if (!player || !player.isBot || player.folded || this.actionOn !== seatIndex) {
            return;
        }

        // Prevent duplicate bot actions
        if (this.pendingBotActions.has(seatIndex)) {
            console.log(`Bot action already pending for seat ${seatIndex}`);
            return;
        }

        this.pendingBotActions.set(seatIndex, true);
        
        try {
            console.log(`🤖 Bot ${player.username} is thinking...`);
            
            // Simulate thinking time
            const thinkTime = 1000 + Math.random() * 2000; // 1-3 seconds
            await new Promise(resolve => setTimeout(resolve, thinkTime));
            
            // Check if still our turn (might have timed out)
            if (this.actionOn !== seatIndex || player.folded) {
                console.log(`🤖 Bot ${player.username} lost turn while thinking`);
                return;
            }
            
            // Simple bot logic
            const callAmount = this.currentBet - player.bet;
            const canCheck = callAmount === 0;
            const potOdds = callAmount > 0 ? callAmount / (this.currentPot + callAmount) : 0;
            
            let action = 'fold';
            let amount = 0;
            
            // Basic decision logic
            if (canCheck) {
                action = 'call'; // Check
            } else if (potOdds < 0.3 && Math.random() < 0.7) {
                action = 'call';
            } else if (Math.random() < 0.1 && player.chips > callAmount * 2) {
                // Occasionally raise
                action = 'raise';
                amount = this.currentBet + this.bigBlind;
            } else {
                action = 'fold';
            }
            
            // Execute the action
            const result = await this.executeAction(seatIndex, action, amount);
            if (result.success) {
                console.log(`🤖 Bot ${player.username} executed ${result.action.type}`);
                
                // Broadcast the action
                this.broadcastGameState({
                    event: 'player_action',
                    action: result.action
                });
                
                // Move to next player
                await this.moveToNextPlayer();
            }
            
        } catch (error) {
            console.error(`Error in bot action for ${player.username}:`, error);
        } finally {
            this.pendingBotActions.delete(seatIndex);
        }
    }

    async endHand() {
        console.log('\n=== ENDING HAND ===');
        
        const activePlayers = this.getActivePlayers();
        
        if (activePlayers.length === 0) {
            console.log('No active players, ending hand');
            this.activeHand = false;
            return;
        }
        
        if (activePlayers.length === 1) {
            // Single winner
            const winner = activePlayers[0];
            const winAmount = this.currentPot;
            winner.chips += winAmount;
            
            console.log(`${winner.username} wins ${winAmount} chips (no showdown)`);
            
            this.broadcastGameState({
                event: 'hand_ended',
                winners: [{
                    seatIndex: winner.seatIndex,
                    username: winner.username,
                    winAmount: winAmount,
                    handRank: null
                }]
            });
        } else {
            // Showdown
            await this.handleShowdown();
        }
        
        // Reset for next hand
        this.activeHand = false;
        this.actionOn = -1;
        
        // Clear any pending timeouts
        if (this.actionTimeout) {
            clearTimeout(this.actionTimeout);
            this.actionTimeout = null;
        }
        
        // Schedule next hand
        setTimeout(async () => {
            if (this.getActivePlayers().length >= 2) {
                await this.startNewHand();
            }
        }, 5000);
    }

    async handleShowdown() {
        const activePlayers = this.getActivePlayers();
        console.log(`Showdown with ${activePlayers.length} players`);
        
        // Evaluate hands
        const handEvaluator = new HandEvaluator();
        const results = [];
        
        for (const player of activePlayers) {
            const playerCards = [...player.cards, ...this.communityCards];
            const evaluation = handEvaluator.evaluateHand(playerCards);
            results.push({
                player: player,
                evaluation: evaluation,
                seatIndex: player.seatIndex
            });
            
            console.log(`${player.username}: ${evaluation.handRank} (${evaluation.description})`);
        }
        
        // Sort by hand strength (higher is better)
        results.sort((a, b) => b.evaluation.handStrength - a.evaluation.handStrength);
        
        // Award pot to winner(s)
        const winners = [results[0]];
        for (let i = 1; i < results.length; i++) {
            if (results[i].evaluation.handStrength === results[0].evaluation.handStrength) {
                winners.push(results[i]);
            } else {
                break;
            }
        }
        
        const winAmount = Math.floor(this.currentPot / winners.length);
        const winnerData = [];
        
        for (const winner of winners) {
            winner.player.chips += winAmount;
            winnerData.push({
                seatIndex: winner.seatIndex,
                username: winner.player.username,
                winAmount: winAmount,
                handRank: winner.evaluation.handRank,
                description: winner.evaluation.description
            });
            
            console.log(`${winner.player.username} wins ${winAmount} chips with ${winner.evaluation.description}`);
        }
        
        this.broadcastGameState({
            event: 'hand_ended',
            winners: winnerData
        });
    }

    broadcastGameState(eventData = {}) {
        const gameState = {
            tableId: this.tableId,
            stakeLevel: this.stakeLevel,
            stake_level: this.stakeLevel,
            gamePhase: this.activeHand ? this.currentRound : 'waiting',
            current_round: this.activeHand ? this.currentRound : 'waiting',
            active_hand: this.activeHand,
            players: this.players.map((player, index) => {
                if (player === null) return null;
                
                return {
                    ...player,
                    seatIndex: index,
                    actionOn: this.actionOn === index,
                    action_on: this.actionOn === index
                };
            }),
            dealer_position: this.dealerPosition,
            current_pot: this.currentPot,
            current_bet: this.currentBet,
            community_cards: this.communityCards,
            action_on: this.actionOn,
            actionOn: this.actionOn,
            hand_number: this.handNumber,
            last_raise_amount_this_round: this.lastRaiseAmountThisRound,
            rake_eligible: this.rakeEligible,
            total_rake: this.totalRake,
            hand_rake: this.handRake,
            betting_limits: this.getBettingLimits()
        };

        const message = {
            type: 'game_state',
            data: {
                ...eventData,
                gameState: gameState
            }
        };

        // Broadcast to all clients
        if (this.websocketServer) {
            // Use broadcastToTable method from websocket server
            this.websocketServer.broadcastToTable(this.tableId, message);
            console.log(`Broadcasted game state: ${eventData.event || 'state_update'}`);
        }
    }

    getBettingLimits() {
        if (!this.activeHand || this.actionOn === -1) {
            return {};
        }

        const player = this.players[this.actionOn];
        if (!player) {
            return {};
        }

        const callAmount = Math.max(0, this.currentBet - player.bet);
        const canCheck = callAmount === 0;
        const minRaise = this.currentBet + Math.max(this.bigBlind, this.lastRaiseAmountThisRound);
        const maxRaise = player.chips + player.bet;

        return {
            min_bet: minRaise,
            max_bet: maxRaise,
            default_bet: Math.min(minRaise, maxRaise),
            call_amount: callAmount,
            can_check: canCheck
        };
    }

    // Save state periodically
    async startPeriodicSave() {
        setInterval(async () => {
            if (this.activeHand) {
                await this.saveToRedis();
            }
        }, 30000); // Save every 30 seconds during active hands
    }

    countActivePlayers() {
        let count = 0;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i] !== null) {
                count++;
            }
        }
        console.log(`PokerGameEngine: Counted ${count} active players at table ${this.tableId}`);
        return count;
    }

    async removePlayer(userId) {
        let removedSeat = -1;
        
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i] && (this.players[i].userId === userId || this.players[i].user_id === userId)) {
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
        let playerSeat = -1;
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i] && (this.players[i].userId === userId || this.players[i].user_id === userId)) {
                playerSeat = i;
                break;
            }
        }
        
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
        console.log(`🎮 Processing action: ${action} by seat ${playerSeat} (${player.username}) for amount ${amount}`);
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

