import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { prisma } from '@/server/db';
import { checkAuthRateLimit } from '@/server/auth/rate-limit';
import {
  verifyGoogleIdToken,
  generateOAuthStateAndNonce,
  generatePKCE,
} from '@/server/auth/google';
import { signAccessToken, isProduction } from '@/server/auth/session';
import {
  generateOpaqueToken,
  hashToken,
  getRefreshTokenExpiry,
} from '@/server/auth/tokens';
import { setAuthCookies } from '@/server/auth/cookies';
import { googleAuthSchema } from '@/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const mode = request.nextUrl.searchParams.get('mode') || 'signin';

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!googleClientId) {
    const errorUrl = new URL(mode === 'signup' ? '/register' : '/signin', request.url);
    errorUrl.searchParams.set('error', 'google_not_configured');
    return NextResponse.redirect(errorUrl);
  }

  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
  const redirectUri = `${proto}://${host}/api/v1/auth/google/callback`;

  const { state, nonce } = generateOAuthStateAndNonce();
  const { codeVerifier, codeChallenge } = generatePKCE();

  const client = new OAuth2Client(googleClientId, googleClientSecret, redirectUri);
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: 'select_account',
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    'qwsc_google_oauth',
    JSON.stringify({ state, nonce, codeVerifier, mode }),
    {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    }
  );

  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkAuthRateLimit(ip)) {
    return NextResponse.json(
      {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please wait a moment before trying again.',
      },
      { status: 429 }
    );
  }

  // Validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parseResult = googleAuthSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid Google authentication parameters.',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { idToken, nonce } = parseResult.data;

  let googlePayload;
  try {
    googlePayload = await verifyGoogleIdToken(idToken, nonce);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid Google ID token.';
    return NextResponse.json(
      {
        statusCode: 401,
        error: 'Unauthorized',
        message,
      },
      { status: 401 }
    );
  }

  const { sub, email, name } = googlePayload;

  // 1. Look up existing OAuth account by provider + sub
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

    // Check account approval and status
    if (user.status === 'PENDING_APPROVAL') {
      return NextResponse.json(
        {
          statusCode: 403,
          error: 'Forbidden',
          code: 'ACCOUNT_PENDING_APPROVAL',
          message:
            'Your account registration is pending administrator approval before you can access member features.',
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            address: user.address,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
            isOnboarded: user.isOnboarded,
            createdAt: user.createdAt.toISOString(),
          },
        },
        { status: 403 }
      );
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        {
          statusCode: 403,
          error: 'Forbidden',
          code: 'ACCOUNT_SUSPENDED',
          message:
            'Your account has been suspended. Please contact club administration.',
        },
        { status: 403 }
      );
    }

    if (user.status === 'INACTIVE') {
      return NextResponse.json(
        {
          statusCode: 403,
          error: 'Forbidden',
          code: 'ACCOUNT_INACTIVE',
          message:
            'Your account is inactive. Please contact club administration.',
        },
        { status: 403 }
      );
    }

    // Active user: issue access & refresh tokens
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
        ipAddress: ip,
      },
    });

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });

    const response = NextResponse.json(
      {
        status: 'ok',
        message: 'Signed in successfully via Google.',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          address: user.address,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          isOnboarded: user.isOnboarded,
          createdAt: user.createdAt.toISOString(),
          hasPassword: Boolean(user.passwordHash),
          providers: ['google'],
        },
      },
      { status: 200 }
    );

    setAuthCookies(response, accessToken, rawRefreshToken);
    return response;
  }

  // 2. No OAuth account found for this Google identity.
  // Check if a user with this email already exists in the system.
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUserByEmail) {
    // SECURITY REQUIREMENT:
    // Do not automatically link a Google identity to an existing account solely because email matches.
    // Require explicit password verification before linking.
    return NextResponse.json(
      {
        statusCode: 409,
        error: 'Conflict',
        code: 'ACCOUNT_LINKING_REQUIRED',
        message:
          'An account with this email address already exists. Please verify your password to link your Google identity.',
        email,
      },
      { status: 409 }
    );
  }

  // 3. New User Registration via Google
  try {
    const newUser = await prisma.$transaction(async (tx) => {
      // Double check for concurrency
      const duplicateOAuth = await tx.oAuthAccount.findUnique({
        where: {
          provider_providerUserId: {
            provider: 'google',
            providerUserId: sub,
          },
        },
      });
      if (duplicateOAuth) {
        throw new Error('DUPLICATE_OAUTH');
      }

      const user = await tx.user.create({
        data: {
          fullName: name,
          email,
          phone: null,
          address: null,
          passwordHash: null,
          role: 'MEMBER', // Public registration is ALWAYS MEMBER
          status: 'PENDING_APPROVAL', // ALWAYS PENDING_APPROVAL
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

    return NextResponse.json(
      {
        status: 'pending',
        code: 'ACCOUNT_PENDING_APPROVAL',
        message:
          'Registration successful via Google. Please complete your player profile.',
        user: {
          id: newUser.id,
          email: newUser.email,
          phone: newUser.phone,
          address: newUser.address,
          fullName: newUser.fullName,
          role: newUser.role,
          status: newUser.status,
          isOnboarded: false,
          createdAt: newUser.createdAt.toISOString(),
          hasPassword: false,
          providers: ['google'],
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const isDuplicate =
      (err instanceof Error && err.message === 'DUPLICATE_OAUTH') ||
      (typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 'P2002');
    if (isDuplicate) {
      return NextResponse.json(
        {
          statusCode: 409,
          error: 'Conflict',
          message: 'This Google identity is already registered.',
        },
        { status: 409 }
      );
    }
    throw err;
  }
}
