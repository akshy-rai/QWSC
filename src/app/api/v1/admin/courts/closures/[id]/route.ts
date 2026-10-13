import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/server/auth/middleware';
import { adminDeleteCourtClosure } from '@/server/bookings';

export const runtime = 'nodejs';

export async function DELETE(
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

  const { id: closureId } = await context.params;
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

  const result = await adminDeleteCourtClosure(closureId, authResult.sub, ipAddress);

  if ('error' in result) {
    return NextResponse.json(
      { statusCode: 404, error: 'Not Found', message: 'Court closure not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Court closure deleted successfully.',
  });
}
