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

        if (!c1Val || !c2Val) return 0;

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
        const minRaiseStake = parseFloat(tableData.stake_level);
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

    // Main decision making (matching Bot.gd flow)
    makeDecision(tableData) {
        const player = tableData.players[this.seatIndex];
        const callAmount = tableData.current_bet - player.bet;
        const isRaised = tableData.current_bet > tableData.stake_level; // Big blind or higher
        
        // Preflop decision
        if (tableData.current_round === 'preflop') {
            if (!this.shouldPlayPreflop(player.cards, isRaised)) {
                return { action: 'fold', amount: 0 };
            }
        }

        // Post-flop hand evaluation
        let handStrength = 0.5; // Default neutral strength
        if (tableData.community_cards && tableData.community_cards.length > 0) {
            const handInfo = HandEvaluator.evaluateHand(player.cards, tableData.community_cards);
            handStrength = this.normalizeHandStrength(handInfo);
        } else {
            // Preflop strength
            handStrength = this.getPreflopStrengthCategory(player.cards) / 3.0;
        }

        const aggressionFactor = this.getAggressionFactor();
        const bluffFrequency = this.getBluffFrequency();
        const isBluff = Math.random() < bluffFrequency && handStrength < 0.3;

        // Decision logic
        if (callAmount === 0) {
            // Can check
            if (handStrength > 0.6 || (isBluff && Math.random() < aggressionFactor)) {
                // Consider betting
                const betSize = this.calculateBetSize(tableData, handStrength, isBluff);
                return { action: 'raise', amount: betSize };
            } else {
                return { action: 'check', amount: 0 };
            }
        } else {
            // Need to call or fold
            const potOdds = callAmount / (tableData.current_pot + callAmount);
            const handEquity = handStrength;

            if (handEquity > potOdds * 1.5 || (handStrength > 0.7)) {
                // Consider raising
                if (Math.random() < aggressionFactor && handStrength > 0.5) {
                    const raiseSize = this.calculateBetSize(tableData, handStrength, isBluff);
                    return { action: 'raise', amount: raiseSize };
                } else {
                    return { action: 'call', amount: callAmount };
                }
            } else if (handEquity > potOdds || handStrength > 0.4) {
                return { action: 'call', amount: callAmount };
            } else {
                return { action: 'fold', amount: 0 };
            }
        }
    }

    // Helper function to normalize hand strength to 0-1 scale
    normalizeHandStrength(handInfo) {
        if (!handInfo) return 0.1;
        
        // Rough normalization based on hand rank
        const rankStrengths = {
            0: 0.1,  // High card
            1: 0.25, // Pair
            2: 0.4,  // Two pair
            3: 0.55, // Three of a kind
            4: 0.7,  // Straight
            5: 0.75, // Flush  
            6: 0.85, // Full house
            7: 0.95, // Four of a kind
            8: 0.98, // Straight flush
            9: 1.0   // Royal flush
        };

        return rankStrengths[handInfo.rank] || 0.1;
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

        return Math.min(baseTime, 5.0); // Cap at 5 seconds
    }
}

module.exports = { BotPlayer, Playstyle };
