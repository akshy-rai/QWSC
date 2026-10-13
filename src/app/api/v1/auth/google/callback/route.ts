import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/server/db';
import { verifyGoogleIdToken } from '@/server/auth/google';
import { signAccessToken } from '@/server/auth/session';
import {
  generateOpaqueToken,
  hashToken,
  getRefreshTokenExpiry,
} from '@/server/auth/tokens';
import { setAuthCookies } from '@/server/auth/cookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const errorParam = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Handle errors returned by Google (e.g., user clicked cancel)
  if (errorParam) {
    const errorUrl = new URL('/signin', request.url);
    errorUrl.searchParams.set('error', errorParam === 'access_denied' ? 'google_cancelled' : errorParam);
    const res = NextResponse.redirect(errorUrl);
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  }

  if (!code || !state) {
    const res = NextResponse.redirect(new URL('/signin?error=invalid_oauth_response', request.url));
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  }

  // Retrieve saved OAuth state from secure HTTP-only cookie
  const oauthCookie = request.cookies.get('qwsc_google_oauth')?.value;
  if (!oauthCookie) {
    return NextResponse.redirect(new URL('/signin?error=oauth_session_expired', request.url));
  }

  let savedState: { state: string; nonce?: string; codeVerifier?: string; mode?: string };
  try {
    savedState = JSON.parse(oauthCookie);
  } catch {
    const res = NextResponse.redirect(new URL('/signin?error=oauth_session_corrupt', request.url));
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  }

  if (savedState.state !== state) {
    const res = NextResponse.redirect(new URL('/signin?error=oauth_state_mismatch', request.url));
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!googleClientId) {
    const res = NextResponse.redirect(new URL('/signin?error=google_not_configured', request.url));
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  }

  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const redirectUri = `${proto}://${host}/api/v1/auth/google/callback`;

  const client = new OAuth2Client(googleClientId, googleClientSecret, redirectUri);

  let tokens;
  try {
    const tokenRes = await client.getToken({
      code,
      codeVerifier: savedState.codeVerifier,
    });
    tokens = tokenRes.tokens;
  } catch {
    const res = NextResponse.redirect(new URL('/signin?error=token_exchange_failed', request.url));
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  }

  if (!tokens?.id_token) {
    const res = NextResponse.redirect(new URL('/signin?error=missing_id_token', request.url));
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  }

  let googlePayload;
  try {
    googlePayload = await verifyGoogleIdToken(tokens.id_token, savedState.nonce);
  } catch {
    const res = NextResponse.redirect(new URL('/signin?error=invalid_id_token', request.url));
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  }

  const { sub, email, name } = googlePayload;

  // 1. Look up existing OAuth account
  const existingOAuth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: 'google',
        providerUserId: sub,
      },
    },
    include: {
      user: true,
    },
  });

  if (existingOAuth) {
    const user = existingOAuth.user;

    if (user.status === 'PENDING_APPROVAL') {
      const redirectUrl = new URL('/register', request.url);
      redirectUrl.searchParams.set('step', 'submitted');
      redirectUrl.searchParams.set('email', user.email);
      redirectUrl.searchParams.set('name', user.fullName);
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
      return res;
    }

    if (user.status === 'SUSPENDED') {
      const res = NextResponse.redirect(new URL('/signin?error=account_suspended', request.url));
      res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
      return res;
    }

    if (user.status === 'INACTIVE') {
      const res = NextResponse.redirect(new URL('/signin?error=account_inactive', request.url));
      res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
      return res;
    }

    // If registered but didn't complete onboarding
    if (!user.isOnboarded) {
      const redirectUrl = new URL('/register', request.url);
      redirectUrl.searchParams.set('step', 'onboarding');
      redirectUrl.searchParams.set('userId', user.id);
      redirectUrl.searchParams.set('email', user.email);
      redirectUrl.searchParams.set('name', user.fullName);
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
      return res;
    }

    // Active user: issue access and refresh tokens
    const familyId = crypto.randomUUID();
    const rawRefreshToken = generateOpaqueToken();
    const hashedRefreshToken = hashToken(rawRefreshToken);
    const refreshTokenExpiry = getRefreshTokenExpiry();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRefreshToken,
        familyId,
        expiresAt: refreshTokenExpiry,
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') ?? 'unknown',
      },
    });

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    const destination = user.role === 'ADMIN' ? '/admin' : '/portal';
    const res = NextResponse.redirect(new URL(destination, request.url));
    setAuthCookies(res, accessToken, rawRefreshToken);
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  }

  // 2. Check if user with this email already exists
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUserByEmail) {
    const redirectUrl = new URL('/signin', request.url);
    redirectUrl.searchParams.set('error', 'account_linking_required');
    redirectUrl.searchParams.set('email', email);
    const res = NextResponse.redirect(redirectUrl);
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  }

  // 3. New User Registration via Google OAuth
  try {
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: name,
          email,
          phone: null,
          address: null,
          passwordHash: null,
          role: 'MEMBER',
          status: 'PENDING_APPROVAL',
          isOnboarded: false,
        },
      });

      await tx.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerUserId: sub,
          email,
        },
      });

      return user;
    });

    const redirectUrl = new URL('/register', request.url);
    redirectUrl.searchParams.set('step', 'onboarding');
    redirectUrl.searchParams.set('userId', newUser.id);
    redirectUrl.searchParams.set('email', newUser.email);
    redirectUrl.searchParams.set('name', newUser.fullName);
    const res = NextResponse.redirect(redirectUrl);
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  } catch {
    const res = NextResponse.redirect(new URL('/signin?error=registration_failed', request.url));
    res.cookies.set('qwsc_google_oauth', '', { maxAge: 0, path: '/' });
    return res;
  }
}
