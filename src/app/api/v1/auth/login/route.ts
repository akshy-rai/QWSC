import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { verifyPassword } from '@/server/auth/hash';
import { signAccessToken } from '@/server/auth/session';
import { generateOpaqueToken, hashToken, getRefreshTokenExpiry } from '@/server/auth/tokens';
import { setAuthCookies } from '@/server/auth/cookies';
import { checkAuthRateLimit } from '@/server/auth/rate-limit';
import { loginSchema } from '@/types';
import crypto from 'node:crypto';

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

  const parseResult = loginSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid credentials format.',
      },
      { status: 400 }
    );
  }

  const { email, password } = parseResult.data;

  // Retrieve user by normalized email
  const user = await prisma.user.findUnique({ where: { email } });

  // Constant-time check: if user not found or has no password set (OAuth-only),
  // perform dummy hash verify to prevent timing attacks
  if (!user || !user.passwordHash) {
    await verifyPassword(
      '$argon2id$v=19$m=19456,t=2,p=1$19erIC5ZRk2iQbgxrFJG0A$hEtWR3I4C1n/HRlEMl6n5NC/x6gie+ANJ3EwpbWMqE8',
      password
    );
    return NextResponse.json(
      {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      },
      { status: 401 }
    );
  }

  // Verify Argon2id password hash
  const isValid = await verifyPassword(user.passwordHash, password);
  if (!isValid) {
    return NextResponse.json(
      {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      },
      { status: 401 }
    );
  }

  // Enforce account approval
  if (user.status === 'PENDING_APPROVAL') {
    return NextResponse.json(
      {
        statusCode: 403,
        error: 'Forbidden',
        code: 'ACCOUNT_PENDING_APPROVAL',
        message:
          'Your registration is currently pending administrator approval. Please wait for an administrator to activate your account.',
      },
      { status: 403 }
    );
  }

  if (user.status !== 'ACTIVE') {
    return NextResponse.json(
      {
        statusCode: 403,
        error: 'Forbidden',
        code: `ACCOUNT_${user.status}`,
        message:
          'Your account is inactive or suspended. Please contact club administrators.',
      },
      { status: 403 }
    );
  }

  // Generate short-lived JWT access token
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
  });

  // Generate opaque refresh token and family tracking
  const rawRefreshToken = generateOpaqueToken();
  const tokenHash = hashToken(rawRefreshToken);
  const familyId = crypto.randomUUID();
  const expiresAt = getRefreshTokenExpiry();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt,
      userAgent: request.headers.get('user-agent'),
      ipAddress: ip,
    },
  });

  // Set secure HTTP-only cookies
  const response = NextResponse.json({
    status: 'ok',
    message: 'Signed in successfully.',
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
  });

  setAuthCookies(response, accessToken, rawRefreshToken);
  return response;
}
