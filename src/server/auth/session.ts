import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import type { UserRole, UserStatus } from '@/types';

// ── Configuration ──────────────────────────────────────────────────────────────

const JWT_SECRET_RAW =
  process.env.JWT_SECRET ||
  'dev_jwt_secret_change_in_production_min_32_chars!';

const jwtSecret = new TextEncoder().encode(JWT_SECRET_RAW);

export const ACCESS_TOKEN_EXPIRES_IN = '15m';
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const isProduction = process.env.NODE_ENV === 'production';

// ── JWT payload shape ──────────────────────────────────────────────────────────

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Signs a short-lived JWT access token (15 min).
 */
export async function signAccessToken(payload: JwtUserPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    status: payload.status,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRES_IN)
    .sign(jwtSecret);
}

/**
 * Verifies a JWT access token and returns the payload.
 * Throws on invalid / expired tokens.
 */
export async function verifyAccessToken(token: string): Promise<JwtUserPayload> {
  const { payload } = await jwtVerify(token, jwtSecret);
  return {
    sub: payload.sub as string,
    email: payload['email'] as string,
    role: payload['role'] as UserRole,
    status: payload['status'] as UserStatus,
  };
}
