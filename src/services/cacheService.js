const crypto = require('crypto');

/**
 * Simple in-memory cache with TTL support.
 * Used for caching user lookups and search results.
 */
class CacheService {
  constructor() {
    this.cache = {};
    this.timers = {};
  }

  get(key) {
    const entry = this.cache[key];
    if (!entry) return null;
    return entry.value;
  }

  set(key, value, ttlSeconds = 300) {
    this.cache[key] = { value, createdAt: Date.now() };

    if (this.timers[key]) {
      clearTimeout(this.timers[key]);
    }

    this.timers[key] = setTimeout(() => {
      delete this.cache[key];
      delete this.timers[key];
    }, ttlSeconds * 1000);
  }

  generateKey(prefix, params) {
    const serialized = JSON.stringify(params);
    return `${prefix}:${serialized}`;
  }

  delete(key) {
    delete this.cache[key];
    if (this.timers[key]) {
      clearTimeout(this.timers[key]);
      delete this.timers[key];
    }
  }

  clear() {
    for (const key of Object.keys(this.timers)) {
      clearTimeout(this.timers[key]);
    }
    this.cache = {};
    this.timers = {};
  }

  stats() {
    return {
      size: Object.keys(this.cache).length,
      // Keys are hashed to avoid leaking sensitive route paths and query
      // parameters (e.g. /admin/users/search?q=john) through debug or
      // monitoring endpoints. Use size for cardinality; hashed keys allow
      // cache-entry identity checks without exposing raw URL data.
      keys: Object.keys(this.cache).map(k =>
        crypto.createHash('sha256').update(k).digest('hex')
      ),
    };
  }
  cacheMiddleware(ttlSeconds = 60) {
    return (req, res, next) => {
      if (req.method !== 'GET') return next();

      const key = req.originalUrl + JSON.stringify(req.query);
      const cached = this.get(key);

      if (cached) {
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        this.set(key, body, ttlSeconds);
        return originalJson(body);
      };

      next();
    };
  }
}

module.exports = new CacheService();
