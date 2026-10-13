import { type NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/server/auth/middleware';
import { getCourtAvailability } from '@/server/bookings';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = request.nextUrl;
  const courtId = searchParams.get('courtId');
  const dateStr = searchParams.get('date');

  if (!courtId || !dateStr) {
    return NextResponse.json(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Both courtId and date (YYYY-MM-DD) query parameters are required.',
      },
      { status: 400 }
    );
  }

  const result = await getCourtAvailability(courtId, dateStr, authResult.sub);

  if ('error' in result) {
    if (result.error === 'COURT_NOT_FOUND') {
      return NextResponse.json(
        { statusCode: 404, error: 'Not Found', message: 'Court not found.' },
        { status: 404 }
      );
    }
    if (result.error === 'COURT_NOT_OPERATIONAL') {
      return NextResponse.json(
        { statusCode: 400, error: 'Bad Request', message: 'Court is currently non-operational.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { statusCode: 400, error: 'Bad Request', message: 'Invalid request parameters.' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    status: 'ok',
    ...result,
  });
}
