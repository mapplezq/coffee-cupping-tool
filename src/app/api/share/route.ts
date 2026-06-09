import { NextResponse } from 'next/server';
import { gzipSync, gunzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

const toBase64Url = (buffer: Buffer) => buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const fromBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const op = body?.op;

    if (op === 'encode') {
      const jsonString = body?.jsonString;
      if (typeof jsonString !== 'string' || jsonString.length === 0) {
        return NextResponse.json({ error: 'Missing jsonString' }, { status: 400 });
      }

      const gz = gzipSync(Buffer.from(jsonString, 'utf-8'));
      const data = `gz:${toBase64Url(gz)}`;
      return NextResponse.json({ success: true, data });
    }

    if (op === 'decode') {
      const data = body?.data;
      if (typeof data !== 'string' || !data.startsWith('gz:')) {
        return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
      }

      const raw = data.slice(3);
      const gz = fromBase64Url(raw);
      const jsonString = gunzipSync(gz).toString('utf-8');
      return NextResponse.json({ success: true, jsonString });
    }

    return NextResponse.json({ error: 'Invalid op' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

