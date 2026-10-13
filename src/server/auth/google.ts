import 'server-only';
import crypto from 'node:crypto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export interface GoogleUserPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
  nonce?: string;
}

let oAuth2ClientInstance: OAuth2Client | null = null;

export function getGoogleOAuthClient(): OAuth2Client {
  if (!oAuth2ClientInstance) {
    oAuth2ClientInstance = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
  }
  return oAuth2ClientInstance;
}

// Allows injecting or mocking token verification during automated test runs
type TokenVerifierFn = (
  idToken: string,
  expectedNonce?: string
) => Promise<GoogleUserPayload>;
let customVerifier: TokenVerifierFn | null = null;

export function setGoogleTokenVerifierForTesting(
  verifier: TokenVerifierFn | null
) {
  customVerifier = verifier;
}

/**
 * Validates a Google ID token server-side:
 * - Cryptographic signature against Google's public JWKS keys
 * - Issuer (https://accounts.google.com or accounts.google.com)
 * - Audience (GOOGLE_CLIENT_ID env)
 * - Expiration timestamp
 * - email_verified claim
 * - Optional nonce for replay protection
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedNonce?: string
): Promise<GoogleUserPayload> {
  if (customVerifier) {
    return customVerifier(idToken, expectedNonce);
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    throw new Error(
      'Google OAuth is not configured: GOOGLE_CLIENT_ID is missing.'
    );
  }

  const client = getGoogleOAuthClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: googleClientId,
  });

  const payload: TokenPayload | undefined = ticket.getPayload();
  if (!payload) {
    throw new Error('Invalid Google ID token: Missing token payload.');
  }

  // Issuer verification
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!payload.iss || !validIssuers.includes(payload.iss)) {
    throw new Error(`Invalid Google ID token issuer: ${payload.iss}`);
  }

  // Audience verification
  if (payload.aud !== googleClientId) {
    throw new Error('Invalid Google ID token: Audience mismatch.');
  }

  if (!payload.sub) {
    throw new Error('Invalid Google ID token: Missing sub claim.');
  }

  if (!payload.email) {
    throw new Error('Invalid Google ID token: Missing email claim.');
  }

  if (!payload.email_verified) {
    throw new Error(
      'Unverified Google email address. Google accounts must have a verified email.'
    );
  }

  // Nonce check for replay protection
  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new Error('Invalid Google ID token: Nonce mismatch.');
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase().trim(),
    emailVerified: Boolean(payload.email_verified),
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
    nonce: payload.nonce,
  };
}

/**
 * Generates PKCE code_verifier and code_challenge (RFC 7636)
 */
export function generatePKCE(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

/**
 * Generates cryptographically secure OAuth state and nonce
 */
export function generateOAuthStateAndNonce(): {
  state: string;
  nonce: string;
} {
  return {
    state: crypto.randomBytes(24).toString('base64url'),
    nonce: crypto.randomBytes(24).toString('base64url'),
  };
}
