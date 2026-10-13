import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/server/auth/middleware';
import { adminUpdateCourt } from '@/server/bookings';
import { adminCourtUpdateSchema } from '@/types';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const roleError = requireRole(authResult, 'ADMIN');
  if (roleError) {
    return roleError;
  }

  const { id: courtId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { statusCode: 400, error: 'Bad Request', message: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const parseResult = adminCourtUpdateSchema.safeParse(body);
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

  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

  const result = await adminUpdateCourt(courtId, parseResult.data, authResult.sub, ipAddress);

  if ('error' in result) {
    if (result.error === 'NOT_FOUND') {
      return NextResponse.json(
        { statusCode: 404, error: 'Not Found', message: 'Court not found.' },
        { status: 404 }
      );
    }
    if (result.error === 'COURT_HAS_ACTIVE_BOOKINGS') {
      return NextResponse.json(
        {
          statusCode: 409,
          error: 'Conflict',
          message: `Cannot deactivate court: There are ${result.activeBookingsCount} active future bookings. Please resolve or cancel existing reservations first.`,
          activeBookingsCount: result.activeBookingsCount,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { statusCode: 500, error: 'Internal Server Error', message: 'Failed to update court.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Court updated successfully.',
    court: result.court,
  });
}
