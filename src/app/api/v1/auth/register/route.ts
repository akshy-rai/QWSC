import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { hashPassword } from '@/server/auth/hash';
import { checkAuthRateLimit } from '@/server/auth/rate-limit';
import { registerSchema } from '@/types';

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

  const parseResult = registerSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid registration details',
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { fullName, email, phone, password } = parseResult.data;

  // Database-enforced uniqueness check
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, ...(phone ? [{ phone }] : [])],
    },
  });

  if (existingUser) {
    return NextResponse.json(
      {
        statusCode: 409,
        error: 'Conflict',
        message:
          'An account with this email address or phone number already exists.',
      },
      { status: 409 }
    );
  }

  // Hash password using Argon2id
  const passwordHash = await hashPassword(password);

  // Create pending user account (role is strictly forced to MEMBER)
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      phone: phone || null,
      passwordHash,
      role: 'MEMBER',
      status: 'PENDING_APPROVAL',
      isOnboarded: false,
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
    },
  });

  // Audit log creation for accountability
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'users',
      entityId: user.id,
      afterState: {
        email: user.email,
        fullName: user.fullName,
        status: user.status,
        isOnboarded: user.isOnboarded,
      },
      ipAddress: ip,
    },
  });

  return NextResponse.json(
    {
      status: 'ok',
      message:
        'Account created successfully. Please complete your player profile.',
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
    { status: 201 }
  );
}
