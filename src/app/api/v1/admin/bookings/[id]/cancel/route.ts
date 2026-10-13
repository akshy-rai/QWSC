import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/server/auth/middleware';
import { cancelCourtBooking } from '@/server/bookings';
import { cancelBookingSchema } from '@/types';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const roleError = requireRole(authResult, ['ADMIN', 'COORDINATOR']);
  if (roleError) {
    return roleError;
  }

  const { id: bookingId } = await context.params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const parseResult = cancelBookingSchema.safeParse(body);
  const reason = parseResult.success ? parseResult.data.reason : 'Administrative cancellation';
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

  const result = await cancelCourtBooking({
    bookingId,
    actorId: authResult.sub,
    actorRole: authResult.role,
    reason,
    ipAddress,
  });

  if ('error' in result) {
    switch (result.error) {
      case 'NOT_FOUND':
        return NextResponse.json(
          { statusCode: 404, error: 'Not Found', message: 'Booking not found.' },
          { status: 404 }
        );
      case 'ALREADY_CANCELLED':
        return NextResponse.json(
          { statusCode: 400, error: 'Bad Request', message: 'Booking is already cancelled.' },
          { status: 400 }
        );
      default:
        return NextResponse.json(
          { statusCode: 500, error: 'Internal Server Error', message: 'Failed to cancel booking.' },
          { status: 500 }
        );
    }
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Booking cancelled administratively.',
    booking: result.booking,
  });
}
