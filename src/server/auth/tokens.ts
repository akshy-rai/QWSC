import 'server-only';
import crypto from 'node:crypto';

const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

/**
 * Generates a high-entropy cryptographically secure opaque token (64 hex characters).
 */
export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes a SHA-256 hash of an opaque token for safe server-side storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Calculates the refresh token expiry Date.
 */
export function getRefreshTokenExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);
  return expiresAt;
}
