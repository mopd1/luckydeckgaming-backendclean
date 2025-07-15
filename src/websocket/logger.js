// src/websocket/logger.js
const logger = {
    info: (message, ...args) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [WEBSOCKET INFO] ${message}`, ...args);
    },
    error: (message, ...args) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] [WEBSOCKET ERROR] ${message}`, ...args);
    },
    warn: (message, ...args) => {
        const timestamp = new Date().toISOString();
        console.warn(`[${timestamp}] [WEBSOCKET WARN] ${message}`, ...args);
    },
    debug: (message, ...args) => {
        if (process.env.NODE_ENV !== 'production') {
            const timestamp = new Date().toISOString();
            console.debug(`[${timestamp}] [WEBSOCKET DEBUG] ${message}`, ...args);
        }
    }
};

module.exports = logger;

