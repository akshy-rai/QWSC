import 'server-only';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Simple in-process rate limiter.
 * Returns true if the request should be allowed, false if it should be blocked.
 *
 * @param key     Unique identifier (e.g. IP address)
 * @param max     Maximum requests per window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): boolean {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Pre-configured auth rate limit check: 10 req/min per IP.
 */
export function checkAuthRateLimit(ip: string): boolean {
  return checkRateLimit(ip, 10, 60_000);
}
