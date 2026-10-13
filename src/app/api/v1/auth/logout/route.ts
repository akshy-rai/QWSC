import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { hashToken } from '@/server/auth/tokens';
import { clearAuthCookies, REFRESH_TOKEN_COOKIE } from '@/server/auth/cookies';

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawRefreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshToken
      .updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      })
      .catch(() => {});
  }

  const response = NextResponse.json({
    status: 'ok',
    message: 'Logged out successfully.',
  });

  clearAuthCookies(response);
  return response;
}
