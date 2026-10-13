import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
    request.method
  );

  if (isMutation && request.nextUrl.pathname.startsWith('/api/v1/')) {
    const origin = request.headers.get('origin');
    if (origin) {
      try {
        const originUrl = new URL(origin);
        const host = request.headers.get('host');

        // Allow if origin matches current host or allowed list
        const allowedOrigins = process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
          : [];

        if (originUrl.host !== host && !allowedOrigins.includes(origin)) {
          return NextResponse.json(
            {
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Cross-site request forgery protection: Untrusted origin.',
            },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          {
            statusCode: 403,
            error: 'Forbidden',
            message: 'Cross-site request forgery protection: Invalid origin.',
          },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
