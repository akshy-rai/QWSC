import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/server/db';
import { checkAuthRateLimit } from '@/server/auth/rate-limit';
import { verifyGoogleIdToken } from '@/server/auth/google';
import { verifyPassword } from '@/server/auth/hash';
import { signAccessToken } from '@/server/auth/session';
import {
  generateOpaqueToken,
  hashToken,
  getRefreshTokenExpiry,
} from '@/server/auth/tokens';
import { setAuthCookies } from '@/server/auth/cookies';
import { googleLinkSchema } from '@/types';

export const runtime = 'nodejs';

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

  const parseResult = googleLinkSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid parameters for account linking.',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { idToken, password } = parseResult.data;

  let googlePayload;
  try {
    googlePayload = await verifyGoogleIdToken(idToken);
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

  const { sub, email } = googlePayload;

  // Verify whether this Google identity is already linked to anyone
  const existingOAuth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerUserId: {
        provider: 'google',
        providerUserId: sub,
      },
    },
  });

  if (existingOAuth) {
    return NextResponse.json(
      {
        statusCode: 409,
        error: 'Conflict',
        message: 'This Google account is already linked to an existing profile.',
      },
      { status: 409 }
    );
  }

  // Find user to link to: by email
  const targetUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!targetUser) {
    return NextResponse.json(
      {
        statusCode: 404,
        error: 'Not Found',
        message: 'Account not found for this email address.',
      },
      { status: 404 }
    );
  }

  // If user has a password, verify password
  if (targetUser.passwordHash) {
    if (!password) {
      return NextResponse.json(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Password is required to link this account.',
        },
        { status: 400 }
      );
    }

    const isPasswordValid = await verifyPassword(
      targetUser.passwordHash,
      password
    );
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid account password. Linking failed.',
        },
        { status: 401 }
      );
    }
  }

  // Perform linking
  await prisma.oAuthAccount.create({
    data: {
      userId: targetUser.id,
      provider: 'google',
      providerUserId: sub,
      email,
    },
  });

  // If user is PENDING_APPROVAL, they still cannot access
  if (targetUser.status === 'PENDING_APPROVAL') {
    return NextResponse.json(
      {
        statusCode: 403,
        error: 'Forbidden',
        code: 'ACCOUNT_PENDING_APPROVAL',
        message:
          'Google account linked successfully. However, your account remains pending administrator approval.',
      },
      { status: 403 }
    );
  }

  if (targetUser.status !== 'ACTIVE') {
    return NextResponse.json(
      {
        statusCode: 403,
        error: 'Forbidden',
        message:
          'Your account is not active. Linking succeeded, but access is restricted.',
      },
      { status: 403 }
    );
  }

  // User is ACTIVE: issue cookies
  const familyId = crypto.randomUUID();
  const rawRefreshToken = generateOpaqueToken();
  const hashedRefreshToken = hashToken(rawRefreshToken);
  const refreshTokenExpiry = getRefreshTokenExpiry();

  await prisma.refreshToken.create({
    data: {
      userId: targetUser.id,
      tokenHash: hashedRefreshToken,
      familyId,
      expiresAt: refreshTokenExpiry,
      userAgent: request.headers.get('user-agent'),
      ipAddress: ip,
    },
  });

  const accessToken = await signAccessToken({
    sub: targetUser.id,
    email: targetUser.email,
    role: targetUser.role,
    status: targetUser.status,
  });

  const response = NextResponse.json(
    {
      status: 'ok',
      message: 'Google identity linked successfully. Signed in.',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        phone: targetUser.phone,
        address: targetUser.address,
        fullName: targetUser.fullName,
        role: targetUser.role,
        status: targetUser.status,
        isOnboarded: targetUser.isOnboarded,
        createdAt: targetUser.createdAt.toISOString(),
        hasPassword: Boolean(targetUser.passwordHash),
        providers: ['google'],
      },
    },
    { status: 200 }
  );

  setAuthCookies(response, accessToken, rawRefreshToken);
  return response;
}
