import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { signAccessToken } from '@/server/auth/session';
import { generateOpaqueToken, hashToken, getRefreshTokenExpiry } from '@/server/auth/tokens';
import { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE } from '@/server/auth/cookies';
import { checkAuthRateLimit } from '@/server/auth/rate-limit';

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

  const rawRefreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  const errorResponse = (message: string, code?: string) => {
    const body: Record<string, unknown> = {
      statusCode: 401,
      error: 'Unauthorized',
      message,
    };
    if (code) body.code = code;
    const res = NextResponse.json(body, { status: 401 });
    clearAuthCookies(res);
    return res;
  };

  if (!rawRefreshToken) {
    return errorResponse('No refresh token provided.');
  }

  const tokenHash = hashToken(rawRefreshToken);

  // Look up refresh token in database
  const existingToken = await prisma.refreshToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });

  if (!existingToken) {
    return errorResponse('Invalid refresh token.');
  }

  // Reuse detection: if token is already revoked or was replaced, revoke the
  // entire family!
  if (existingToken.isRevoked || existingToken.replacedBy) {
    await prisma.refreshToken.updateMany({
      where: { familyId: existingToken.familyId },
      data: { isRevoked: true },
    });
    return errorResponse(
      'Security violation: Refresh token reuse detected. All sessions in this chain have been revoked.',
      'REFRESH_TOKEN_REUSE_DETECTED'
    );
  }

  // Check expiry
  if (existingToken.expiresAt < new Date()) {
    return errorResponse('Refresh token has expired. Please sign in again.');
  }

  // Enforce user account status
  if (existingToken.user.status !== 'ACTIVE') {
    await prisma.refreshToken.updateMany({
      where: { familyId: existingToken.familyId },
      data: { isRevoked: true },
    });
    const res = NextResponse.json(
      {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Account is no longer active.',
      },
      { status: 403 }
    );
    clearAuthCookies(res);
    return res;
  }

  // Token rotation: generate new token and replace the current token atomically
  const newRawRefreshToken = generateOpaqueToken();
  const newTokenHash = hashToken(newRawRefreshToken);
  const newExpiresAt = getRefreshTokenExpiry();

  await prisma.$transaction(async (tx) => {
    const createdNew = await tx.refreshToken.create({
      data: {
        userId: existingToken.userId,
        tokenHash: newTokenHash,
        familyId: existingToken.familyId,
        expiresAt: newExpiresAt,
        userAgent: request.headers.get('user-agent'),
        ipAddress: ip,
      },
    });

    await tx.refreshToken.update({
      where: { id: existingToken.id },
      data: {
        isRevoked: true,
        replacedBy: createdNew.id,
      },
    });
  });

  // Issue new access token
  const newAccessToken = await signAccessToken({
    sub: existingToken.user.id,
    email: existingToken.user.email,
    role: existingToken.user.role,
    status: existingToken.user.status,
  });

  const response = NextResponse.json({
    status: 'ok',
    message: 'Session refreshed successfully.',
    user: {
      id: existingToken.user.id,
      email: existingToken.user.email,
      phone: existingToken.user.phone,
      fullName: existingToken.user.fullName,
      role: existingToken.user.role,
      status: existingToken.user.status,
      createdAt: existingToken.user.createdAt.toISOString(),
    },
  });

  setAuthCookies(response, newAccessToken, newRawRefreshToken);
  return response;
}
