const crypto = require('crypto');

/**
 * In-memory cache with TTL support, LRU-style size cap, and prefix invalidation.
 * Used for caching user lookups and search results.
 *
 * IMPORTANT — Scalability notes:
 *  1. MAX_SIZE caps heap growth. When the limit is reached the oldest entry
 *     (by insertion order, approximating LRU) is evicted before the new one
 *     is stored, preventing OOM under high-cardinality search traffic.
 *  2. Keys are SHA-256 hashed so raw user-supplied query strings are never
 *     stored as plain object keys or leaked through monitoring.
 *  3. This cache is process-local. In a multi-replica deployment every
 *     instance has a divergent cache. For consistent admin operations
 *     (bulk-delete, role update) replace this with a shared Redis cache.
 *     Admin mutation routes should call deleteByPrefix() after writes so
 *     that search/export/stats endpoints don't serve stale results within
 *     a single replica.
 */
class CacheService {
  constructor(maxSize = 500) {
    this.cache = {};
    this.timers = {};
    this.MAX_SIZE = maxSize;
  }

  get(key) {
    const hashed = this._hash(key);
    const entry = this.cache[hashed];
    if (!entry) return null;
    return entry.value;
  }

  set(key, value, ttlSeconds = 300) {
    const hashed = this._hash(key);

    // Evict the oldest entry when the size cap is reached.
    // Object.keys() preserves insertion order in V8 for string keys,
    // so the first key is reliably the oldest (LRU approximation).
    if (!this.cache[hashed] && Object.keys(this.cache).length >= this.MAX_SIZE) {
      const oldest = Object.keys(this.cache)[0];
      if (oldest) this._evict(oldest);
    }

    this.cache[hashed] = { value, rawKey: key, createdAt: Date.now() };

    if (this.timers[hashed]) {
      clearTimeout(this.timers[hashed]);
    }

    this.timers[hashed] = setTimeout(() => {
      delete this.cache[hashed];
      delete this.timers[hashed];
    }, ttlSeconds * 1000);
  }

  generateKey(prefix, params) {
    const serialized = JSON.stringify(params);
    return `${prefix}:${serialized}`;
  }

  delete(key) {
    const hashed = this._hash(key);
    this._evict(hashed);
  }

  /**
   * Invalidates all cache entries whose original (unhashed) key starts with
   * the given prefix. Call this from admin mutation routes (bulk-delete, role
   * update) to prevent GET endpoints from returning stale results.
   *
   * Example:
   *   cacheService.deleteByPrefix('/admin/users');
   */
  deleteByPrefix(prefix) {
    for (const hashed of Object.keys(this.cache)) {
      const entry = this.cache[hashed];
      if (entry && entry.rawKey && entry.rawKey.startsWith(prefix)) {
        this._evict(hashed);
      }
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
      maxSize: this.MAX_SIZE,
      // Keys are already stored hashed; return them directly.
      // This avoids leaking sensitive route paths and query parameters
      // (e.g. /admin/users/search?q=john) through debug or monitoring
      // endpoints. Use size for cardinality; hashed keys allow cache-entry
      // identity checks without exposing raw URL data.
      keys: Object.keys(this.cache),
    };
  }

  cacheMiddleware(ttlSeconds = 60) {
    return (req, res, next) => {
      if (req.method !== 'GET') return next();

      // Use originalUrl as the logical key; _hash() will store it hashed,
      // so raw user-supplied query strings never appear as object keys.
      const key = req.originalUrl;
      const cached = this.get(key);

      if (cached) {
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache successful responses to avoid storing error payloads.
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.set(key, body, ttlSeconds);
        }
        return originalJson(body);
      };

      next();
    };
  }

  /** @private */
  _hash(key) {
    return crypto.createHash('sha256').update(String(key)).digest('hex');
  }

  /** @private — removes a hashed key from both cache and timers */
  _evict(hashed) {
    delete this.cache[hashed];
    if (this.timers[hashed]) {
      clearTimeout(this.timers[hashed]);
      delete this.timers[hashed];
    }
  }
}

module.exports = new CacheService();
