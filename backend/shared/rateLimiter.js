'use strict';

const config = require('./config');

/**
 * Sliding-window in-memory rate limiter.
 *
 * Each key (e.g. an IP address) maintains a list of request timestamps.
 * Old timestamps outside the window are pruned on each check.
 *
 * Production note: replace the in-memory store with Redis
 * (ioredis) for a horizontally-scaled deployment. The public API
 * (check / stats / reset) is intentionally adapter-agnostic.
 */
class RateLimiter {
  constructor({
    windowMs    = config.rateLimit.windowMs,
    maxRequests = config.rateLimit.maxRequests,
    enabled     = config.rateLimit.enabled
  } = {}) {
    this.windowMs    = windowMs;
    this.maxRequests = maxRequests;
    this.enabled     = enabled;
    this._store      = new Map();

    // Prune stale entries every minute to avoid unbounded memory growth
    const timer = setInterval(() => this._prune(), 60_000);
    if (timer.unref) timer.unref();
  }

  /**
   * Check whether `key` has exceeded the rate limit.
   * Side-effect: records the current timestamp for `key`.
   *
   * @returns {{ limited: boolean, remaining: number, resetAt: number }}
   */
  check(key) {
    if (!this.enabled) {
      return { limited: false, remaining: this.maxRequests, resetAt: Date.now() + this.windowMs };
    }

    const now = Date.now();

    if (!this._store.has(key)) this._store.set(key, []);

    const timestamps = this._store.get(key);
    timestamps.push(now);

    // slide: drop entries older than the window
    const cutoff = now - this.windowMs;
    while (timestamps.length > 0 && timestamps[0] < cutoff) timestamps.shift();

    const count     = timestamps.length;
    const limited   = count > this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - count);
    const resetAt   = timestamps.length > 0 ? timestamps[0] + this.windowMs : now + this.windowMs;

    return { limited, remaining, resetAt };
  }

  /** Return stats for a key without recording a new request. */
  stats(key) {
    const now  = Date.now();
    const ts   = (this._store.get(key) || []).filter(t => now - t < this.windowMs);
    const count = ts.length;
    return {
      requests:  count,
      limit:     this.maxRequests,
      remaining: Math.max(0, this.maxRequests - count),
      windowMs:  this.windowMs
    };
  }

  /** Reset the counter for a specific key (e.g. after whitelist approval). */
  reset(key) {
    this._store.delete(key);
  }

  /** Total number of tracked keys (diagnostic). */
  get size() { return this._store.size; }

  _prune() {
    const cutoff = Date.now() - this.windowMs;
    for (const [key, ts] of this._store) {
      const fresh = ts.filter(t => t > cutoff);
      if (fresh.length === 0) this._store.delete(key);
      else this._store.set(key, fresh);
    }
  }
}

// Singleton shared across the gateway process
module.exports = new RateLimiter();
