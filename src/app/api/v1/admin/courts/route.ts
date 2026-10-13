import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/server/auth/middleware';
import { getAllCourtsAdmin } from '@/server/bookings';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const roleError = requireRole(authResult, ['ADMIN', 'COORDINATOR']);
  if (roleError) {
    return roleError;
  }

  const { searchParams } = request.nextUrl;
  const sportSlug = searchParams.get('sport') || undefined;

  const courts = await getAllCourtsAdmin(sportSlug);

  return NextResponse.json({
    status: 'ok',
    courts,
  });
}
