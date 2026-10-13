import { type NextRequest, NextResponse } from 'next/server';
import { getBookableCourts } from '@/server/bookings';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const sportSlug = searchParams.get('sport') || 'badminton';

  const courts = await getBookableCourts(sportSlug);

  return NextResponse.json({
    status: 'ok',
    courts,
  });
}
