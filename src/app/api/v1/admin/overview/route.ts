import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/server/auth/middleware';
import { getAdminOverviewStats } from '@/server/admin/registrations';

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

  const counts = await getAdminOverviewStats();

  return NextResponse.json({
    status: 'ok',
    counts,
  });
}
