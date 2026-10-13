import { type NextRequest, NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/server/auth/middleware';
import { getAdminMembers } from '@/server/admin/registrations';
import type { UserStatus } from '@/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const roleError = requireRole(authResult, 'ADMIN');
  if (roleError) {
    return roleError;
  }

  const { searchParams } = request.nextUrl;
  const statusParam = searchParams.get('status') || 'ALL';
  const searchParam = searchParams.get('search') || undefined;
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const limitParam = parseInt(searchParams.get('limit') || '10', 10);

  const result = await getAdminMembers({
    status: statusParam as UserStatus | 'ALL',
    search: searchParam,
    page: isNaN(pageParam) ? 1 : pageParam,
    limit: isNaN(limitParam) ? 10 : limitParam,
  });

  return NextResponse.json({
    status: 'ok',
    members: result.users.map((u) => ({
      ...u,
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : new Date().toISOString(),
      sportProfiles: u.sportProfiles?.map((sp) => ({
        ...sp,
        skillRating: sp.skillRating ? sp.skillRating.toString() : null,
      })),
    })),
    pagination: result.pagination,
  });
}
