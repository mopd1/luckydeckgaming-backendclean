// middleware/cache.js
const { getAsync, setAsync, existsAsync, delAsync } = require('../services/redisClient');

// Default cache duration (in seconds)
const DEFAULT_CACHE_DURATION = 3600; // 1 hour

/**
 * Middleware to cache API responses
 * @param {number} duration - Cache duration in seconds
 */
const cacheMiddleware = (duration = DEFAULT_CACHE_DURATION) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    // Create a unique cache key based on URL and any query parameters
    const cacheKey = `api:${req.originalUrl}`;
    console.log(`Checking cache for key: ${cacheKey}`);
    
    try {
      // Check if the response is already cached
      const exists = await existsAsync(cacheKey);
      if (exists) {
        // Return cached response
        const cachedResponse = await getAsync(cacheKey);
        const data = JSON.parse(cachedResponse);
        // Add cache hit header for debugging
        console.log(`Cache HIT for key: ${cacheKey}`);
        return res.set('X-Cache', 'HIT').json(data);
      }
      // If not cached, replace res.json with custom implementation to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Cache the response
        setAsync(cacheKey, JSON.stringify(data), 'EX', duration)
          .then(() => console.log(`Cached data with key: ${cacheKey}`))
          .catch(err => console.error('Redis caching error:', err));
        // Add cache miss header for debugging
        console.log(`Cache MISS for key: ${cacheKey}`);
        res.set('X-Cache', 'MISS');
        // Call the original res.json method
        return originalJson.call(this, data);
      };
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching if there's an error
      next();
    }
  };
};

/**
 * Clears cache for a specific API endpoint
 * @param {string} url - The URL path to clear cache for
 */
const clearCache = async (url) => {
  try {
    // Make sure the url starts with /api/
    const fullUrl = url.startsWith('/api') ? url : `/api${url.startsWith('/') ? url : '/' + url}`;
    const cacheKey = `api:${fullUrl}`;
    await delAsync(cacheKey);
    console.log(`Cache cleared for ${cacheKey}`);
    return true;
  } catch (error) {
    console.error('Clear cache error:', error);
    return false;
  }
};

module.exports = {
  cacheMiddleware,
  clearCache
};
