import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { checkAuthRateLimit } from '@/server/auth/rate-limit';
import { verifyAccessToken } from '@/server/auth/session';
import { ACCESS_TOKEN_COOKIE } from '@/server/auth/cookies';
import { onboardSchema } from '@/types';

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

  const parseResult = onboardSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid onboarding details',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { userId: bodyUserId, phone, address, divisionCode, preferredSlot } =
    parseResult.data;

  // Determine target user ID:
  // 1. Try active session token if present
  let targetUserId: string | undefined;
  const cookieToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  let token = cookieToken;
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  let isAuthenticated = false;
  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      targetUserId = payload.sub;
      isAuthenticated = true;
    } catch {
      // Token invalid or expired; proceed to bodyUserId check
    }
  }

  if (!targetUserId && bodyUserId) {
    targetUserId = bodyUserId;
  }

  if (!targetUserId) {
    return NextResponse.json(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: 'User ID is required to complete onboarding.',
      },
      { status: 400 }
    );
  }

  // Check if user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    return NextResponse.json(
      {
        statusCode: 404,
        error: 'Not Found',
        message: 'User account not found.',
      },
      { status: 404 }
    );
  }

  // If request is not authenticated via active token, user must be PENDING_APPROVAL
  if (!isAuthenticated && targetUser.status !== 'PENDING_APPROVAL') {
    return NextResponse.json(
      {
        statusCode: 403,
        error: 'Forbidden',
        message:
          'Only pending registrations can complete unauthenticated onboarding.',
      },
      { status: 403 }
    );
  }

  // Check phone uniqueness
  const existingPhoneUser = await prisma.user.findFirst({
    where: {
      phone,
      id: { not: targetUserId },
    },
  });

  if (existingPhoneUser) {
    return NextResponse.json(
      {
        statusCode: 409,
        error: 'Conflict',
        message: 'An account with this phone number already exists.',
      },
      { status: 409 }
    );
  }

  // Update user with phone, address, and mark isOnboarded: true
  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      phone,
      address,
      isOnboarded: true,
    },
    select: {
      id: true,
      email: true,
      phone: true,
      address: true,
      fullName: true,
      role: true,
      status: true,
      isOnboarded: true,
      createdAt: true,
      passwordHash: true,
      oauthAccounts: {
        select: { provider: true },
      },
    },
  });

  // Upsert Badminton MemberSportProfile if badminton sport exists
  const badminton = await prisma.sport.findUnique({
    where: { slug: 'badminton' },
  });

  if (badminton) {
    await prisma.memberSportProfile.upsert({
      where: {
        userId_sportId: {
          userId: targetUserId,
          sportId: badminton.id,
        },
      },
      update: {
        divisionCode: divisionCode || 'DIV_C',
        preferredFlight: preferredSlot || 'FLEXIBLE',
      },
      create: {
        userId: targetUserId,
        sportId: badminton.id,
        divisionCode: divisionCode || 'DIV_C',
        preferredFlight: preferredSlot || 'FLEXIBLE',
      },
    });
  }

  // Audit log entry
  await prisma.auditLog.create({
    data: {
      actorUserId: targetUserId,
      action: 'USER_ONBOARDED',
      entityType: 'users',
      entityId: targetUserId,
      afterState: {
        phone: updatedUser.phone,
        address: updatedUser.address,
        isOnboarded: updatedUser.isOnboarded,
        divisionCode: divisionCode || 'DIV_C',
        preferredSlot: preferredSlot || 'FLEXIBLE',
      },
      ipAddress: ip,
    },
  });

  return NextResponse.json(
    {
      status: 'ok',
      message:
        'Profile details submitted successfully. Your account is pending administrator approval before you can access member features.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        status: updatedUser.status,
        isOnboarded: updatedUser.isOnboarded,
        createdAt: updatedUser.createdAt.toISOString(),
        hasPassword: Boolean(updatedUser.passwordHash),
        providers: updatedUser.oauthAccounts?.map((o) => o.provider) || [],
      },
    },
    { status: 200 }
  );
}
