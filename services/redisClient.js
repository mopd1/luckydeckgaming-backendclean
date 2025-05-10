// services/redisClient.js
const Redis = require('ioredis');
const { promisify } = require('util');

// Initialize Redis client with connection details from .env
let redisClient;

if (process.env.NODE_ENV === 'aws') {
  // AWS ElastiCache configuration
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'luckydeck-redis.qaiuda.0001.eun1.cache.amazonaws.com',
    port: process.env.REDIS_PORT || 6379,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      // Reconnect after times * 1000 milliseconds
      return Math.min(times * 100, 3000);
    }
  });
} else {
  // Local Redis configuration for development
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  });
}

// Log Redis connection events
redisClient.on('connect', () => {
  console.log('Connected to Redis server');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Promisify Redis commands for easier async/await usage
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);
const delAsync = promisify(redisClient.del).bind(redisClient);
const existsAsync = promisify(redisClient.exists).bind(redisClient);
const expireAsync = promisify(redisClient.expire).bind(redisClient);
const keysAsync = promisify(redisClient.keys).bind(redisClient);

module.exports = {
  redisClient,
  getAsync,
  setAsync,
  delAsync,
  existsAsync,
  expireAsync,
  keysAsync
};
