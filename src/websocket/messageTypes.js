const MessageTypes = {
    // Client -> Server messages
    CLIENT: {
        JOIN_TABLE: 'join_table',
        LEAVE_TABLE: 'leave_table',
        GAME_ACTION: 'game_action',
        CHAT: 'chat',
        PING: 'ping'
    },

    // Server -> Client messages
    SERVER: {
        CONNECTION_ESTABLISHED: 'connection_established',
        GAME_STATE: 'game_state',
        CHAT: 'chat',
        ERROR: 'error',
        PONG: 'pong'
    }
};

const GameActions = {
    BET: 'bet',
    FOLD: 'fold',
    CALL: 'call',
    RAISE: 'raise'
};

module.exports = {
    MessageTypes,
    GameActions
};
