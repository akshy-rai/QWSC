import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/server/auth/middleware';
import { getPendingRegistrations } from '@/server/admin/registrations';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const roleError = requireRole(authResult, 'ADMIN');
  if (roleError) {
    return roleError;
  }

  const pendingUsers = await getPendingRegistrations();

  return NextResponse.json({
    status: 'ok',
    count: pendingUsers.length,
    users: pendingUsers.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
