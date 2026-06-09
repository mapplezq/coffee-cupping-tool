import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

type Item = { data: string; expiresAt: number };

const STORE_KEY = '__cupping_shortlink_store__';
const getStore = (): Map<string, Item> => {
  const g = globalThis as any;
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map<string, Item>();
  return g[STORE_KEY] as Map<string, Item>;
};

const base62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const toBase62 = (bytes: Uint8Array) => {
  let out = '';
  for (const b of bytes) out += base62[b % base62.length];
  return out;
};

const now = () => Date.now();
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const cleanup = (store: Map<string, Item>) => {
  const t = now();
  for (const [k, v] of store.entries()) {
    if (v.expiresAt <= t) store.delete(k);
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = body?.data;
    if (typeof data !== 'string' || data.length === 0) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }
    if (data.length > 50000) {
      return NextResponse.json({ error: 'Data too large' }, { status: 413 });
    }

    const store = getStore();
    if (store.size > 5000) cleanup(store);

    let code = '';
    for (let i = 0; i < 5; i++) {
      code = toBase62(randomBytes(10));
      if (!store.has(code)) break;
    }
    if (!code || store.has(code)) {
      return NextResponse.json({ error: 'Failed to allocate code' }, { status: 500 });
    }

    store.set(code, { data, expiresAt: now() + TTL_MS });
    return NextResponse.json({ success: true, code });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || '';
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    const store = getStore();
    const item = store.get(code);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (item.expiresAt <= now()) {
      store.delete(code);
      return NextResponse.json({ error: 'Expired' }, { status: 410 });
    }
    return NextResponse.json({ success: true, data: item.data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

