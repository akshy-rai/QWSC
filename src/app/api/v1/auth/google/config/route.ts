import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const rawId = process.env.GOOGLE_CLIENT_ID || '';
  const clientId = rawId.replace(/^["']|["']$/g, '').trim();

  return NextResponse.json({
    clientId,
    enabled: Boolean(clientId),
  });
}
