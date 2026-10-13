import { type NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/server/auth/middleware';
import { createCourtBooking, getUserCourtBookings } from '@/server/bookings';
import { createBookingSchema } from '@/types';

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { statusCode: 400, error: 'Bad Request', message: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const parseResult = createBookingSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Validation failed.',
        errors: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { courtId, startTime, endTime, notes } = parseResult.data;
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

  const result = await createCourtBooking({
    courtId,
    userId: authResult.sub, // Server-authoritative authenticated identity
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    notes,
    ipAddress,
  });

  if ('error' in result) {
    switch (result.error) {
      case 'INVALID_TIME_RANGE':
        return NextResponse.json(
          { statusCode: 400, error: 'Bad Request', message: 'End time must be strictly after start time.' },
          { status: 400 }
        );
      case 'CANNOT_BOOK_IN_PAST':
        return NextResponse.json(
          { statusCode: 400, error: 'Bad Request', message: 'Cannot book slots in the past.' },
          { status: 400 }
        );
      case 'INVALID_SLOT_DURATION':
        return NextResponse.json(
          { statusCode: 400, error: 'Bad Request', message: 'Booking slot duration must be 60 or 90 minutes.' },
          { status: 400 }
        );
      case 'EXCEEDS_ADVANCE_HORIZON':
        return NextResponse.json(
          { statusCode: 400, error: 'Bad Request', message: 'Court bookings can only be reserved up to 14 days in advance.' },
          { status: 400 }
        );
      case 'MEMBER_NOT_ELIGIBLE':
        return NextResponse.json(
          { statusCode: 403, error: 'Forbidden', message: 'Only active members in good standing may book courts.' },
          { status: 403 }
        );
      case 'MAX_BOOKINGS_LIMIT_REACHED':
        return NextResponse.json(
          { statusCode: 422, error: 'Unprocessable Entity', message: 'You have reached the maximum allowed active bookings limit (3).' },
          { status: 422 }
        );
      case 'COURT_NOT_AVAILABLE':
        return NextResponse.json(
          { statusCode: 404, error: 'Not Found', message: 'Selected court is currently unavailable or non-operational.' },
          { status: 404 }
        );
      case 'COURT_CLOSED':
        return NextResponse.json(
          { statusCode: 409, error: 'Conflict', message: 'Court is closed for maintenance or club event during the requested time.' },
          { status: 409 }
        );
      case 'SLOT_ALREADY_BOOKED':
        return NextResponse.json(
          { statusCode: 409, error: 'Conflict', message: 'This court time slot has already been booked by another member.' },
          { status: 409 }
        );
      case 'USER_ALREADY_BOOKED_AT_THIS_TIME':
        return NextResponse.json(
          { statusCode: 409, error: 'Conflict', message: 'You already have another active booking overlapping this time.' },
          { status: 409 }
        );
      default:
        return NextResponse.json(
          { statusCode: 500, error: 'Internal Server Error', message: 'Failed to create court booking.' },
          { status: 500 }
        );
    }
  }

  return NextResponse.json(
    {
      status: 'ok',
      message: 'Court booking confirmed successfully.',
      booking: result.booking,
    },
    { status: 201 }
  );
}
