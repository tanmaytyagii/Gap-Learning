const { HttpError } = require('./errors');

/**
 * Fixed-window, in-memory rate limiter keyed by client IP. Enough for a single instance; a
 * multi-instance deployment would move the counters to a shared store.
 */
function rateLimit({ windowMs, max }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (hits.size > 10000) {
      hits.forEach((value, mapKey) => { if (value.resetAt <= now) hits.delete(mapKey); });
    }

    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.set('RateLimit-Reset', String(retryAfter));
    if (entry.count > max) {
      res.set('Retry-After', String(retryAfter));
      return next(new HttpError(429, 'rate_limited', `Too many AI requests. Try again in ${Math.ceil(retryAfter / 60)} min.`));
    }
    return next();
  };
}

module.exports = { rateLimit };
