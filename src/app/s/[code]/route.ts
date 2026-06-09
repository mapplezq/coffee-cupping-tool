import { NextResponse } from 'next/server';

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');
  const to = searchParams.get('to');

  const url = new URL('/session/join', request.url);
  url.searchParams.set('code', code);
  if (mode) url.searchParams.set('mode', mode);
  if (to) url.searchParams.set('to', to);

  return NextResponse.redirect(url);
}

