// src/poker/PokerDeck.js
class PokerDeck {
    constructor() {
        this.suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        for (const suit of this.suits) {
            for (const rank of this.ranks) {
                this.cards.push({ suit, rank });
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        if (this.cards.length === 0) {
            throw new Error('Deck is empty');
        }
        return this.cards.pop();
    }

    cardsRemaining() {
        return this.cards.length;
    }
}

module.exports = PokerDeck;
