import { type NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/server/auth/middleware';
import { getUserCourtBookings } from '@/server/bookings';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const bookings = await getUserCourtBookings(authResult.sub);

  return NextResponse.json({
    status: 'ok',
    bookings,
  });
}
