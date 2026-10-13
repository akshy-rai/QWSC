import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { authenticate } from '@/server/auth/middleware';
import { clearAuthCookies } from '@/server/auth/cookies';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = await prisma.user.findUnique({
    where: { id: authResult.sub },
    select: {
      id: true,
      email: true,
      phone: true,
      address: true,
      isOnboarded: true,
      fullName: true,
      role: true,
      status: true,
      createdAt: true,
      passwordHash: true,
      oauthAccounts: {
        select: { provider: true },
      },
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    const res = NextResponse.json(
      {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User session no longer valid.',
      },
      { status: 401 }
    );
    clearAuthCookies(res);
    return res;
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      address: user.address,
      isOnboarded: user.isOnboarded,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      hasPassword: Boolean(user.passwordHash),
      providers: user.oauthAccounts?.map((o) => o.provider) || [],
    },
  });
}
