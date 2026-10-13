import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/server/auth/middleware';
import { approveRegistration } from '@/server/admin/registrations';

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

  const result = await approveRegistration(id, authResult.sub, ip);

  if ('error' in result) {
    if (result.error === 'CANNOT_APPROVE_SELF') {
      return NextResponse.json(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Administrators cannot approve their own account.',
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
    if (result.error === 'ALREADY_ACTIVE') {
      return NextResponse.json(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: 'User account is already active.',
        },
        { status: 400 }
      );
    }
    if (result.error === 'INVALID_TRANSITION') {
      return NextResponse.json(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Cannot approve registration: invalid status transition.',
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
    message: `Registration for ${result.user.fullName} (${result.user.email}) approved successfully.`,
    user: {
      ...result.user,
      createdAt: result.user.createdAt.toISOString(),
      updatedAt: result.user.updatedAt.toISOString(),
    },
  });
}
