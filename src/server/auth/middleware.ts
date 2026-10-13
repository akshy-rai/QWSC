import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, type JwtUserPayload } from './session';
import { ACCESS_TOKEN_COOKIE, clearAuthCookies } from './cookies';
import type { UserRole } from '@/types';

import { prisma } from '@/server/db';

export type { JwtUserPayload };

/**
 * Reads and verifies the access token from the request cookies or Authorization
 * Bearer header. Returns the payload on success, or a NextResponse error on
 * failure.
 *
 * Usage in Route Handlers:
 *   const authResult = await authenticate(request);
 *   if (authResult instanceof NextResponse) return authResult;
 *   const user = authResult; // JwtUserPayload
 */
export async function authenticate(
  request: NextRequest
): Promise<JwtUserPayload | NextResponse> {
  const cookieToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  let token = cookieToken;

  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return NextResponse.json(
      {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required. No valid session or token provided.',
      },
      { status: 401 }
    );
  }

  try {
    const payload = await verifyAccessToken(token);

    // Synchronize with active database record to invalidate stale sessions immediately
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true, role: true },
    });

    const currentStatus = dbUser ? dbUser.status : payload.status;
    const currentRole = dbUser ? dbUser.role : payload.role;

    // Enforce account approval / active status
    if (currentStatus !== 'ACTIVE') {
      return NextResponse.json(
        {
          statusCode: 403,
          error: 'Forbidden',
          code: `ACCOUNT_${currentStatus}`,
          message:
            currentStatus === 'PENDING_APPROVAL'
              ? 'Your account is pending administrator approval.'
              : 'Your account is inactive or suspended.',
        },
        { status: 403 }
      );
    }

    return {
      ...payload,
      status: currentStatus,
      role: currentRole,
    };
  } catch {
    return NextResponse.json(
      {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token.',
      },
      { status: 401 }
    );
  }
}

/**
 * Checks that an authenticated user has the required role.
 * Returns a NextResponse error if not, undefined if OK.
 */
export function requireRole(
  user: JwtUserPayload,
  allowedRoles: UserRole | UserRole[]
): NextResponse | undefined {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.role)) {
    return NextResponse.json(
      {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions to perform this action.',
      },
      { status: 403 }
    );
  }
  return undefined;
}

/**
 * Convenience: authenticate + clearAuthCookies on a pre-built response.
 * Used in /refresh and /me where we need to clear cookies on auth failures.
 */
export function unauthorizedAndClear(message: string): NextResponse {
  const response = NextResponse.json(
    { statusCode: 401, error: 'Unauthorized', message },
    { status: 401 }
  );
  clearAuthCookies(response);
  return response;
}
