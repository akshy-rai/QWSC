import { type NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/server/auth/middleware';
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

  const { id: bookingId } = await context.params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional for cancellation
  }

  const parseResult = cancelBookingSchema.safeParse(body);
  const reason = parseResult.success ? parseResult.data.reason : undefined;
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
          { statusCode: 400, error: 'Bad Request', message: 'This booking is already cancelled.' },
          { status: 400 }
        );
      case 'UNAUTHORIZED':
        return NextResponse.json(
          {
            statusCode: 403,
            error: 'Forbidden',
            message: 'You can only cancel your own bookings.',
          },
          { status: 403 }
        );
      case 'CANCELLATION_DEADLINE_PASSED':
        return NextResponse.json(
          {
            statusCode: 400,
            error: 'Bad Request',
            message:
              'Bookings cannot be cancelled less than 6 hours prior to the scheduled start time. Please contact a club coordinator.',
          },
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
    message: 'Booking cancelled successfully.',
    booking: result.booking,
  });
}
