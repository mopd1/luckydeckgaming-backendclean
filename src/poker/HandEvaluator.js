// src/poker/HandEvaluator.js
const CARD_VALUES = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    "J": 11, "Q": 12, "K": 13, "A": 14
};

const HandRank = {
    HIGH_CARD: 0,
    PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
    ROYAL_FLUSH: 9
};

class HandEvaluator {
    static evaluateHand(playerCards, communityCards) {
        const allCards = [...playerCards, ...communityCards];
        if (allCards.length < 5) {
            return { rank: HandRank.HIGH_CARD, values: [] };
        }

        // Check all possible 5-card combinations
        const combinations = this.getCombinations(allCards, 5);
        let bestHand = { rank: -1, values: [] };

        for (const combo of combinations) {
            const hand = this.evaluateFiveCardHand(combo);
            if (this.compareHands(hand, bestHand) > 0) {
                bestHand = hand;
            }
        }

        return bestHand;
    }

    static evaluateFiveCardHand(cards) {
        // Check for flush
        const isFlush = this.checkFlush(cards);
        
        // Check for straight
        const straightResult = this.checkStraight(cards);
        const isStraight = straightResult.rank === HandRank.STRAIGHT;

        // If both flush and straight
        if (isFlush.rank === HandRank.FLUSH && isStraight) {
            if (straightResult.values[0] === 14) { // Ace high straight flush
                return { rank: HandRank.ROYAL_FLUSH, values: [14] };
            } else {
                return { rank: HandRank.STRAIGHT_FLUSH, values: straightResult.values };
            }
        }

        // Check for four of a kind
        const fourOfAKind = this.checkFourOfAKind(cards);
        if (fourOfAKind.rank === HandRank.FOUR_OF_A_KIND) {
            return fourOfAKind;
        }

        // Check for full house
        const fullHouse = this.checkFullHouse(cards);
        if (fullHouse.rank === HandRank.FULL_HOUSE) {
            return fullHouse;
        }

        // Return flush if found
        if (isFlush.rank === HandRank.FLUSH) {
            return isFlush;
        }

        // Return straight if found
        if (isStraight) {
            return straightResult;
        }

        // Check for three of a kind
        const threeOfAKind = this.checkThreeOfAKind(cards);
        if (threeOfAKind.rank === HandRank.THREE_OF_A_KIND) {
            return threeOfAKind;
        }

        // Check for two pair
        const twoPair = this.checkTwoPair(cards);
        if (twoPair.rank === HandRank.TWO_PAIR) {
            return twoPair;
        }

        // Check for pair
        const pair = this.checkPair(cards);
        if (pair.rank === HandRank.PAIR) {
            return pair;
        }

        // High card
        return this.checkHighCard(cards);
    }

    static checkFlush(cards) {
        const suits = {};
        for (const card of cards) {
            suits[card.suit] = (suits[card.suit] || 0) + 1;
            if (suits[card.suit] >= 5) {
                const flushCards = cards.filter(c => c.suit === card.suit);
                const values = flushCards.map(c => CARD_VALUES[c.rank]).sort((a, b) => b - a);
                return { rank: HandRank.FLUSH, values: values.slice(0, 5) };
            }
        }
        return { rank: -1, values: [] };
    }

    static checkStraight(cards) {
        const values = [...new Set(cards.map(c => CARD_VALUES[c.rank]))].sort((a, b) => b - a);
        
        // Check for wheel (A-2-3-4-5)
        if (values.includes(14) && values.includes(2) && values.includes(3) && 
            values.includes(4) && values.includes(5)) {
            return { rank: HandRank.STRAIGHT, values: [5] }; // 5-high straight
        }

        // Check for regular straights
        for (let i = 0; i <= values.length - 5; i++) {
            let consecutive = true;
            for (let j = 1; j < 5; j++) {
                if (values[i + j] !== values[i] - j) {
                    consecutive = false;
                    break;
                }
            }
            if (consecutive) {
                return { rank: HandRank.STRAIGHT, values: [values[i]] };
            }
        }

        return { rank: -1, values: [] };
    }

    static checkFourOfAKind(cards) {
        const ranks = {};
        for (const card of cards) {
            const value = CARD_VALUES[card.rank];
            ranks[value] = (ranks[value] || 0) + 1;
            if (ranks[value] === 4) {
                const kicker = Math.max(...Object.keys(ranks).map(Number).filter(v => v !== value));
                return { rank: HandRank.FOUR_OF_A_KIND, values: [value, kicker] };
            }
        }
        return { rank: -1, values: [] };
    }

    static checkFullHouse(cards) {
        const ranks = {};
        for (const card of cards) {
            const value = CARD_VALUES[card.rank];
            ranks[value] = (ranks[value] || 0) + 1;
        }

        let trips = -1;
        let pair = -1;

        for (const [value, count] of Object.entries(ranks)) {
            const val = parseInt(value);
            if (count >= 3 && val > trips) {
                trips = val;
            } else if (count >= 2 && val > pair) {
                pair = val;
            }
        }

        if (trips !== -1 && pair !== -1) {
            return { rank: HandRank.FULL_HOUSE, values: [trips, pair] };
        }

        return { rank: -1, values: [] };
    }

    static checkThreeOfAKind(cards) {
        const ranks = {};
        for (const card of cards) {
            const value = CARD_VALUES[card.rank];
            ranks[value] = (ranks[value] || 0) + 1;
            if (ranks[value] === 3) {
                const kickers = [];
                for (const [v, count] of Object.entries(ranks)) {
                    const val = parseInt(v);
                    if (val !== value && count >= 1) {
                        kickers.push(val);
                    }
                }
                kickers.sort((a, b) => b - a);
                return { rank: HandRank.THREE_OF_A_KIND, values: [value, ...kickers.slice(0, 2)] };
            }
        }
        return { rank: -1, values: [] };
    }

    static checkTwoPair(cards) {
        const ranks = {};
        for (const card of cards) {
            const value = CARD_VALUES[card.rank];
            ranks[value] = (ranks[value] || 0) + 1;
        }

        const pairs = [];
        for (const [value, count] of Object.entries(ranks)) {
            if (count >= 2) {
                pairs.push(parseInt(value));
            }
        }

        if (pairs.length >= 2) {
            pairs.sort((a, b) => b - a);
            const kicker = Math.max(...Object.keys(ranks).map(Number).filter(v => !pairs.includes(v)));
            return { rank: HandRank.TWO_PAIR, values: [pairs[0], pairs[1], kicker] };
        }

        return { rank: -1, values: [] };
    }

    static checkPair(cards) {
        const ranks = {};
        for (const card of cards) {
            const value = CARD_VALUES[card.rank];
            ranks[value] = (ranks[value] || 0) + 1;
            if (ranks[value] === 2) {
                const kickers = [];
                for (const [v, count] of Object.entries(ranks)) {
                    const val = parseInt(v);
                    if (val !== value && count >= 1) {
                        kickers.push(val);
                    }
                }
                kickers.sort((a, b) => b - a);
                return { rank: HandRank.PAIR, values: [value, ...kickers.slice(0, 3)] };
            }
        }
        return { rank: -1, values: [] };
    }

    static checkHighCard(cards) {
        const values = cards.map(c => CARD_VALUES[c.rank]).sort((a, b) => b - a);
        return { rank: HandRank.HIGH_CARD, values: values.slice(0, 5) };
    }

    static getCombinations(arr, k) {
        if (k > arr.length || k <= 0) return [];
        if (k === arr.length) return [arr];
        if (k === 1) return arr.map(el => [el]);

        const result = [];
        for (let i = 0; i < arr.length - k + 1; i++) {
            const head = arr[i];
            const tailCombs = this.getCombinations(arr.slice(i + 1), k - 1);
            for (const tailComb of tailCombs) {
                result.push([head, ...tailComb]);
            }
        }
        return result;
    }

    static compareHands(hand1, hand2) {
        if (hand1.rank > hand2.rank) return 1;
        if (hand1.rank < hand2.rank) return -1;

        // Same rank, compare values
        for (let i = 0; i < Math.max(hand1.values.length, hand2.values.length); i++) {
            const val1 = hand1.values[i] || 0;
            const val2 = hand2.values[i] || 0;
            if (val1 > val2) return 1;
            if (val1 < val2) return -1;
        }

        return 0; // Equal hands
    }

    static handRankToString(handInfo) {
        const rankNames = {
            [HandRank.HIGH_CARD]: "High Card",
            [HandRank.PAIR]: "Pair",
            [HandRank.TWO_PAIR]: "Two Pair", 
            [HandRank.THREE_OF_A_KIND]: "Three of a Kind",
            [HandRank.STRAIGHT]: "Straight",
            [HandRank.FLUSH]: "Flush",
            [HandRank.FULL_HOUSE]: "Full House",
            [HandRank.FOUR_OF_A_KIND]: "Four of a Kind",
            [HandRank.STRAIGHT_FLUSH]: "Straight Flush",
            [HandRank.ROYAL_FLUSH]: "Royal Flush"
        };

        return rankNames[handInfo.rank] || "Unknown";
    }
}

module.exports = { HandEvaluator, HandRank, CARD_VALUES };
