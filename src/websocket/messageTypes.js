// src/websocket/messageTypes.js
const MessageTypes = {
    // Client -> Server messages
    CLIENT: {
        JOIN_TABLE: 'join_table',
        LEAVE_TABLE: 'leave_table',
        POKER_ACTION: 'poker_action',
        REQUEST_TABLE_LIST: 'request_table_list',
        REQUEST_GAME_STATE: 'request_game_state',
        PING: 'ping'
    },
    
    // Server -> Client messages
    SERVER: {
        CONNECTION_ESTABLISHED: 'connection_established',
        GAME_STATE: 'game_state',
        TABLE_LIST: 'table_list',
        TABLE_JOINED: 'table_joined',
        TABLE_LEFT: 'table_left',
        PLAYER_ACTION: 'player_action',
        HAND_STARTED: 'hand_started',
        HAND_ENDED: 'hand_ended',
        YOUR_TURN: 'your_turn',
        ERROR: 'error',
        PONG: 'pong'
    },

    // Poker-specific action types
    POKER_ACTIONS: {
        FOLD: 'fold',
        CHECK: 'check',
        CALL: 'call',
        RAISE: 'raise',
        ALL_IN: 'all_in'
    },

    // Game phases
    GAME_PHASES: {
        WAITING: 'waiting',
        PREFLOP: 'preflop',
        FLOP: 'flop',
        TURN: 'turn',
        RIVER: 'river',
        SHOWDOWN: 'showdown'
    }
};

module.exports = { MessageTypes };
