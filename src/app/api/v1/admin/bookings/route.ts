import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/server/auth/middleware';
import { getAdminCourtBookings } from '@/server/bookings';
import type { BookingStatus } from '@/types';

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
  const dateParam = searchParams.get('date') || undefined;
  const courtIdParam = searchParams.get('courtId') || undefined;
  const statusParam = searchParams.get('status') || 'ALL';
  const searchParam = searchParams.get('search') || undefined;
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limitParam = parseInt(searchParams.get('limit') || '15', 10);

  const result = await getAdminCourtBookings({
    date: dateParam,
    courtId: courtIdParam,
    status: statusParam as BookingStatus | 'ALL',
    search: searchParam,
    page: isNaN(pageParam) ? 1 : pageParam,
    limit: isNaN(limitParam) ? 15 : limitParam,
  });

  return NextResponse.json({
    status: 'ok',
    bookings: result.bookings,
    pagination: result.pagination,
  });
}
