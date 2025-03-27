const { MessageTypes, GameActions } = require('../../src/websocket/messageTypes');

describe('Message Types', () => {
    test('should have all required client message types', () => {
        expect(MessageTypes.CLIENT).toEqual({
            JOIN_TABLE: 'join_table',
            LEAVE_TABLE: 'leave_table',
            GAME_ACTION: 'game_action',
            CHAT: 'chat',
            PING: 'ping'
        });
    });

    test('should have all required server message types', () => {
        expect(MessageTypes.SERVER).toEqual({
            CONNECTION_ESTABLISHED: 'connection_established',
            GAME_STATE: 'game_state',
            CHAT: 'chat',
            ERROR: 'error',
            PONG: 'pong'
        });
    });

    test('should have all required game actions', () => {
        expect(GameActions).toEqual({
            BET: 'bet',
            FOLD: 'fold',
            CALL: 'call',
            RAISE: 'raise'
        });
    });
});
