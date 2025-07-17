// src/poker/BotPlayer.js
const { HandEvaluator, CARD_VALUES } = require('./HandEvaluator');

const Playstyle = {
    TAG: 0,        // Tight-Aggressive
    LAG: 1,        // Loose-Aggressive  
    NIT: 2,        // Tight-Passive (Rock)
    LP: 3,         // Loose-Passive (Calling Station)
    MANIAC: 4      // Very Loose-Aggressive
};

const BOT_NAMES = {
    [Playstyle.TAG]: ["SolidSteve", "ValueViper", "TightTitan", "AceHunter"],
    [Playstyle.LAG]: ["AggroAnnie", "LooseLucy", "PressurePete", "BluffBetty"],
    [Playstyle.NIT]: ["RockRick", "PatientPat", "NitNate", "FoldyFreddy"],
    [Playstyle.LP]: ["CallingCarl", "PassivePam", "LimpyLarry", "CheckyCharlie"],
    [Playstyle.MANIAC]: ["CrazyChris", "WildWendy", "ManiacMike", "GambleGary"]
};

class BotPlayer {
    constructor(seatIndex, tableId, startingChips) {
        this.seatIndex = seatIndex;
        this.tableId = tableId;
        this.chips = startingChips;
        
        // Assign random playstyle (matching Bot.gd logic)
        const styles = Object.values(Playstyle).filter(v => typeof v === 'number');
        this.playstyle = styles[Math.floor(Math.random() * styles.length)];
        
        // Choose name based on style
        const namesForStyle = BOT_NAMES[this.playstyle];
        this.displayName = namesForStyle[Math.floor(Math.random() * namesForStyle.length)];
        
        // Generate simple avatar data
        this.avatarData = {
            hair: Math.floor(Math.random() * 10),
            face: Math.floor(Math.random() * 10), 
            clothes: Math.floor(Math.random() * 10)
        };

        console.log(`Bot ${seatIndex} (${this.displayName}) created with style ${Object.keys(Playstyle)[this.playstyle]}`);
    }

    getPlayerData() {
        return {
            user_id: `bot_${this.seatIndex}`,
            name: this.displayName,
            chips: this.chips,
            bet: 0,
            folded: false,
            sitting_out: false,
            cards: [],
            auto_post_blinds: true,
            last_action: "",
            last_action_amount: 0,
            time_bank: 30.0,
            avatar_data: this.avatarData,
            is_bot: true
        };
    }

    // Get preflop hand strength (matching Bot.gd logic exactly)
    getPreflopStrengthCategory(handCards) {
        if (!handCards || handCards.length < 2) return 0;
        
        const c1Rank = handCards[0].rank;
        const c2Rank = handCards[1].rank;
        const c1Suit = handCards[0].suit;
        const c2Suit = handCards[1].suit;

        const c1Val = CARD_VALUES[c1Rank];
        const c2Val = CARD_VALUES[c2Rank];

        if (c1Val === undefined || c2Val === undefined) return 0;

        const isPair = (c1Val === c2Val);
        const isSuited = (c1Suit === c2Suit);
        const highCardValue = 10; // Value for 'T'
        const mediumCardValue = 8; // Value for '8'

        if (isPair && c1Val >= highCardValue) return 3; // Premium Pair (TT+)
        if (isPair) return 2; // Any other pair
        if (c1Val >= highCardValue && c2Val >= highCardValue) return 3; // Two high cards
        if (isSuited && (c1Val >= highCardValue || c2Val >= highCardValue)) return 2; // Suited high card
        if (c1Val >= mediumCardValue && c2Val >= mediumCardValue) return 1; // Two medium cards
        if (isSuited) return 1; // Any other suited
        return 0; // Junk
    }

    // Should play preflop (matching Bot.gd logic)
    shouldPlayPreflop(handCards, isRaised) {
        const category = this.getPreflopStrengthCategory(handCards);

        switch (this.playstyle) {
            case Playstyle.TAG:
                return category >= 2 || (category >= 1 && !isRaised);
            case Playstyle.LAG:
                return category >= 1 || (category === 0 && !isRaised && Math.random() < 0.1);
            case Playstyle.NIT:
                return category >= 3 || (category === 2 && !isRaised && Math.random() < 0.2);
            case Playstyle.LP:
                return category >= 1 || (category === 0 && !isRaised && Math.random() < 0.3);
            case Playstyle.MANIAC:
                return Math.random() < 0.95; // Almost always plays
        }
        return false;
    }

    // Get aggression factor (matching Bot.gd)
    getAggressionFactor() {
        switch (this.playstyle) {
            case Playstyle.TAG: return 0.6;
            case Playstyle.LAG: return 0.8;
            case Playstyle.NIT: return 0.1;
            case Playstyle.LP: return 0.2;
            case Playstyle.MANIAC: return 0.95;
        }
        return 0.5;
    }

    // Get bluff frequency (matching Bot.gd)
    getBluffFrequency() {
        switch (this.playstyle) {
            case Playstyle.TAG: return 0.15;
            case Playstyle.LAG: return 0.40;
            case Playstyle.NIT: return 0.01;
            case Playstyle.LP: return 0.05;
            case Playstyle.MANIAC: return 0.60;
        }
        return 0.1;
    }

    // Calculate bet size (matching Bot.gd logic)
    calculateBetSize(tableData, handStrength, isBluff) {
        const potSize = parseFloat(tableData.current_pot || 0);
        const minRaiseStake = parseFloat(tableData.stake_level || 100);
        const currentBet = parseFloat(tableData.current_bet || 0);
        const botBet = parseFloat(tableData.players[this.seatIndex].bet || 0);
        const botChips = parseFloat(tableData.players[this.seatIndex].chips || 0);

        const lastRaiseAmount = parseFloat(tableData.last_raise_amount_this_round || 0);
        const minRaiseIncrement = Math.max(minRaiseStake, lastRaiseAmount);
        const minLegalTotalBet = currentBet + minRaiseIncrement;

        let targetBetFraction = 0.0;

        // Determine bet fraction based on hand strength and style
        if (isBluff) {
            switch (this.playstyle) {
                case Playstyle.TAG: targetBetFraction = 0.4 + Math.random() * 0.2; break;
                case Playstyle.LAG: targetBetFraction = 0.5 + Math.random() * 0.3; break;
                case Playstyle.NIT: targetBetFraction = 0.3; break;
                case Playstyle.LP: targetBetFraction = 0.3; break;
                case Playstyle.MANIAC: targetBetFraction = 0.6 + Math.random() * 0.4; break;
            }
        } else {
            // Value betting
            const baseSize = handStrength * 0.2; // Scale with hand strength
            switch (this.playstyle) {
                case Playstyle.TAG: targetBetFraction = baseSize + 0.3; break;
                case Playstyle.LAG: targetBetFraction = baseSize + 0.4; break;
                case Playstyle.NIT: targetBetFraction = baseSize + 0.2; break;
                case Playstyle.LP: targetBetFraction = baseSize + 0.25; break;
                case Playstyle.MANIAC: targetBetFraction = baseSize + 0.5; break;
            }
        }

        // Calculate target bet amount
        const targetBetAmount = Math.max(potSize * targetBetFraction, minLegalTotalBet);
        const maxBet = botChips + botBet;

        return Math.min(Math.floor(targetBetAmount), maxBet);
    }

    // Main decision making - completely rewritten to match Bot.gd logic
    makeDecision(tableData) {
        const player = tableData.players[this.seatIndex];
        if (!player) {
            console.error(`BotPlayer: Player not found at seat ${this.seatIndex}`);
            return { action: 'fold', amount: 0 };
        }

        const botChips = parseFloat(player.chips || 0);
        const botBet = parseFloat(player.bet || 0);
        const currentBet = parseFloat(tableData.current_bet || 0);
        const potSize = parseFloat(tableData.current_pot || 0);
        const callAmount = currentBet - botBet;
        const isPreflop = (tableData.gamePhase === 'preflop');
        const canCheck = callAmount <= 0.01;

        console.log(`Bot ${this.displayName} decision: Phase=${tableData.gamePhase}, CurrentBet=${currentBet}, BotBet=${botBet}, CallAmount=${callAmount}, Chips=${botChips}`);

        // Validate basic state
        if (botChips <= 0) {
            console.log(`Bot ${this.displayName} has no chips, folding`);
            return { action: 'fold', amount: 0 };
        }

        // All-in situation check (matching Bot.gd logic)
        if (callAmount > 0.01 && callAmount >= botChips - 0.01) {
            console.log(`Bot ${this.displayName} facing all-in call situation (Call: ${callAmount.toFixed(2)}, Chips: ${botChips.toFixed(2)})`);
            return this.makeAllInDecision(tableData, player);
        }

        // Preflop logic (matching Bot.gd)
        if (isPreflop) {
            const stakeLevel = parseFloat(tableData.stake_level || 100);
            const isRaisedToBBot = currentBet > stakeLevel;
            
            if (!this.shouldPlayPreflop(player.cards, isRaisedToBBot)) {
                if (canCheck) {
                    console.log(`Bot ${this.displayName} checks preflop (weak hand)`);
                    return { action: 'check', amount: 0 };
                } else {
                    console.log(`Bot ${this.displayName} folds preflop (weak hand)`);
                    return { action: 'fold', amount: 0 };
                }
            }

            const aggression = this.getAggressionFactor();
            const preflopStrengthCat = this.getPreflopStrengthCategory(player.cards);
            let raiseChance = 0.0;
            
            if (preflopStrengthCat >= 2) raiseChance = aggression * 1.5;
            else if (preflopStrengthCat >= 1) raiseChance = aggression * 0.8;

            if (Math.random() < raiseChance) {
                const raiseAmount = this.calculatePreflopRaiseSize(tableData, player);
                console.log(`Bot ${this.displayName} raises preflop to ${raiseAmount}`);
                return { action: 'raise', amount: raiseAmount };
            } else {
                console.log(`Bot ${this.displayName} calls/checks preflop`);
                return { action: canCheck ? 'check' : 'call', amount: 0 };
            }
        }

        // Postflop logic (matching Bot.gd)
        const handInfo = HandEvaluator.evaluateHand(player.cards, tableData.community_cards);
        if (!handInfo) {
            console.error(`Bot ${this.displayName} could not evaluate postflop hand!`);
            return { action: canCheck ? 'check' : 'fold', amount: 0 };
        }

        const handStrength = handInfo.rank;
        const aggression = this.getAggressionFactor();
        const bluffFreq = this.getBluffFrequency();
        let shouldBetOrRaise = false;
        let isBluffAttempt = false;

        // Determine if bot should bet/raise
        if (handStrength >= 1) { // Pair or better
            if (Math.random() < aggression) {
                shouldBetOrRaise = true;
            }
        } else if (Math.random() < bluffFreq) {
            shouldBetOrRaise = true;
            isBluffAttempt = true;
        }

        if (canCheck) {
            // Can check - decide whether to bet
            if (shouldBetOrRaise) {
                const betAmount = this.calculateBetSize(tableData, handStrength, isBluffAttempt);
                if (betAmount <= currentBet) {
                    console.log(`Bot ${this.displayName} checks postflop (calculated bet was too small)`);
                    return { action: 'check', amount: 0 };
                }
                console.log(`Bot ${this.displayName} bets postflop to ${betAmount} (Bluff: ${isBluffAttempt})`);
                return { action: 'raise', amount: betAmount };
            } else {
                console.log(`Bot ${this.displayName} checks postflop`);
                return { action: 'check', amount: 0 };
            }
        } else {
            // Facing a bet - decide call/raise/fold
            if (shouldBetOrRaise) {
                const raiseAmount = this.calculateBetSize(tableData, handStrength, isBluffAttempt);
                if (raiseAmount > currentBet + 0.01) {
                    console.log(`Bot ${this.displayName} raises postflop to ${raiseAmount} (Bluff: ${isBluffAttempt})`);
                    return { action: 'raise', amount: raiseAmount };
                } else {
                    console.log(`Bot ${this.displayName} calls postflop (intended raise too small)`);
                    return { action: 'call', amount: 0 };
                }
            } else {
                // Passive: call or fold
                let shouldFoldWeak = false;
                if (handStrength < 1) { // Weaker than a pair
                    const potOdds = callAmount / (potSize + callAmount);
                    
                    if (potOdds > 0.4 && this.playstyle !== Playstyle.LP && this.playstyle !== Playstyle.MANIAC) {
                        shouldFoldWeak = true;
                    } else if (this.playstyle === Playstyle.LP || this.playstyle === Playstyle.MANIAC) {
                        if (callAmount < botChips * 0.6 && Math.random() < 0.8) {
                            shouldFoldWeak = false;
                        } else if (callAmount >= botChips * 0.6) {
                            shouldFoldWeak = true;
                        } else {
                            shouldFoldWeak = false;
                        }
                    } else if (callAmount > botChips * 0.5) {
                        shouldFoldWeak = true;
                    }
                }

                if (shouldFoldWeak) {
                    console.log(`Bot ${this.displayName} folds postflop (weak hand vs bet)`);
                    return { action: 'fold', amount: 0 };
                } else {
                    console.log(`Bot ${this.displayName} calls postflop`);
                    return { action: 'call', amount: 0 };
                }
            }
        }
    }

    // All-in decision logic (matching Bot.gd)
    makeAllInDecision(tableData, player) {
        const callAmount = parseFloat(tableData.current_bet || 0) - parseFloat(player.bet || 0);
        const isPreflop = (tableData.gamePhase === 'preflop');
        
        let handStrength = 0;
        if (isPreflop) {
            const preflopCat = this.getPreflopStrengthCategory(player.cards);
            handStrength = preflopCat >= 2 ? 1 : 0; // Good or better = 1, else 0
        } else {
            const handInfo = HandEvaluator.evaluateHand(player.cards, tableData.community_cards);
            handStrength = (handInfo && handInfo.rank >= 1) ? 1 : 0; // Pair or better = 1, else 0
        }

        // All-in call/fold logic based on playstyle (matching Bot.gd)
        let shouldCallAllIn = false;
        switch (this.playstyle) {
            case Playstyle.NIT:
                shouldCallAllIn = handStrength >= 1; // Only call with strong hands
                break;
            case Playstyle.TAG:
                shouldCallAllIn = handStrength >= 1; // Call with pairs or better
                break;
            case Playstyle.LAG:
                shouldCallAllIn = handStrength >= 1 || Math.random() < 0.3; // Call wider
                break;
            case Playstyle.LP:
                shouldCallAllIn = handStrength >= 1 || Math.random() < 0.8; // Calling station
                break;
            case Playstyle.MANIAC:
                shouldCallAllIn = Math.random() < 0.9; // Almost always call
                break;
        }

        const action = shouldCallAllIn ? 'call' : 'fold';
        console.log(`Bot ${this.displayName} all-in decision: ${action}`);
        return { action, amount: 0 };
    }

    // Calculate preflop raise size (matching Bot.gd)
    calculatePreflopRaiseSize(tableData, player) {
        const currentBet = parseFloat(tableData.current_bet || 0);
        const stakeLevel = parseFloat(tableData.stake_level || 100);
        const botBet = parseFloat(player.bet || 0);
        const botChips = parseFloat(player.chips || 0);
        const potSize = parseFloat(tableData.current_pot || 0);
        const callAmount = currentBet - botBet;
        
        const lastRaiseAmount = parseFloat(tableData.last_raise_amount_this_round || 0);
        const minRaiseInc = Math.max(stakeLevel, lastRaiseAmount);
        const minLegalTotalRaise = currentBet + minRaiseInc;

        let raiseToAmount = 0;
        const isRaisedToBBot = currentBet > stakeLevel;

        if (!isRaisedToBBot) {
            // Standard opening raise
            raiseToAmount = stakeLevel * (2.5 + Math.random() * 1.5); // 2.5-4x BB
        } else {
            // Re-raise
            const threeXRaise = currentBet + minRaiseInc * (2.5 + Math.random() * 1.0); // 2.5-3.5x
            const potAfterCall = potSize + callAmount;
            const potSizedRaiseAmount = potAfterCall * 1.0;
            const potSizedRaiseTotal = currentBet + potSizedRaiseAmount;
            raiseToAmount = Math.max(threeXRaise, potSizedRaiseTotal);
        }

        raiseToAmount = Math.max(raiseToAmount, minLegalTotalRaise);
        const finalTotalBet = Math.min(botBet + botChips, raiseToAmount);

        return Math.floor(finalTotalBet);
    }

    // Generate random think time (matching frontend bot timing)
    getThinkTime(action, amount) {
        let baseTime = 1.0 + Math.random() * 1.0; // 1-2 seconds base

        // Add time for complex decisions
        if (action === 'raise' && amount > 0) {
            baseTime += Math.random() * 1.5; // Extra thinking for raises
        }

        // Style-based adjustments
        switch (this.playstyle) {
            case Playstyle.NIT:
                baseTime += Math.random() * 2.0; // Nits think longer
                break;
            case Playstyle.MANIAC:
                baseTime *= 0.7; // Maniacs act faster
                break;
        }

        return Math.min(baseTime, 3.0); // Cap at 3 seconds for testing
    }
}

module.exports = { BotPlayer, Playstyle };
