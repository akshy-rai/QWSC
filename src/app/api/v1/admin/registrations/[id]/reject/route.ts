import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/server/auth/middleware';
import { rejectRegistration } from '@/server/admin/registrations';
import { adminRegistrationActionSchema } from '@/types';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const roleError = requireRole(authResult, 'ADMIN');
  if (roleError) {
    return roleError;
  }

  const { id } = await params;
  const ip = request.headers.get('x-forwarded-for');

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parseResult = adminRegistrationActionSchema.safeParse(body);
  const reason = parseResult.success ? parseResult.data.reason : undefined;

  const result = await rejectRegistration(id, authResult.sub, ip, reason);

  if ('error' in result) {
    if (result.error === 'CANNOT_REJECT_SELF') {
      return NextResponse.json(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Administrators cannot reject their own account.',
        },
        { status: 400 }
      );
    }
    if (result.error === 'NOT_FOUND') {
      return NextResponse.json(
        {
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found.',
        },
        { status: 404 }
      );
    }
    if (result.error === 'ALREADY_INACTIVE') {
      return NextResponse.json(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: 'This registration has already been rejected or marked inactive.',
        },
        { status: 400 }
      );
    }
    if (result.error === 'INVALID_TRANSITION') {
      return NextResponse.json(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Cannot reject registration: invalid status transition.',
        },
        { status: 400 }
      );
    }
  }

  if (!result.user) {
    return NextResponse.json(
      { statusCode: 500, error: 'Internal Server Error' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: 'ok',
    message: `Registration for ${result.user.fullName} was rejected.`,
    user: result.user,
  });
}
