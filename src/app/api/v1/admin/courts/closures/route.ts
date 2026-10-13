import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/server/auth/middleware';
import { adminCreateCourtClosure, getCourtClosures } from '@/server/bookings';
import { adminCreateClosureSchema } from '@/types';

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
  const courtId = searchParams.get('courtId') || undefined;

  const closures = await getCourtClosures(courtId);

  return NextResponse.json({
    status: 'ok',
    closures,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const roleError = requireRole(authResult, 'ADMIN');
  if (roleError) {
    return roleError;
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

  const parseResult = adminCreateClosureSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: parseResult.error.issues[0]?.message || 'Validation failed.',
      },
      { status: 400 }
    );
  }

  const { courtId, sportId, reason, startTime, endTime } = parseResult.data;
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

  const result = await adminCreateCourtClosure({
    courtId,
    sportId,
    reason,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    actorId: authResult.sub,
    ipAddress,
  });

  if ('error' in result) {
    if (result.error === 'INVALID_TIME_RANGE') {
      return NextResponse.json(
        { statusCode: 400, error: 'Bad Request', message: 'End time must be after start time.' },
        { status: 400 }
      );
    }
    if (result.error === 'CLOSURE_CONFLICTS_WITH_EXISTING_BOOKINGS') {
      return NextResponse.json(
        {
          statusCode: 409,
          error: 'Conflict',
          message: `Closure conflicts with ${result.conflicts.length} existing booking(s). Please resolve or cancel conflicting bookings before scheduling this closure.`,
          conflicts: result.conflicts,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { statusCode: 500, error: 'Internal Server Error', message: 'Failed to create court closure.' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      status: 'ok',
      message: 'Court closure scheduled successfully.',
      closure: result.closure,
    },
    { status: 201 }
  );
}
