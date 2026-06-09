import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { FEISHU_CONFIG } from '@/lib/feishu-config';
import { addRecordToBitable, getTenantAccessToken, searchRecordItemsFromBitable } from '@/lib/feishu';

const base62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const toBase62 = (bytes: Uint8Array) => {
  let out = '';
  for (const b of bytes) out += base62[b % base62.length];
  return out;
};

const now = () => Date.now();
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const toText = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const v0 = value[0] as any;
    if (typeof v0 === 'string') return v0;
    if (v0 && typeof v0 === 'object') return String(v0.text ?? v0.name ?? '');
    return '';
  }
  if (value && typeof value === 'object') {
    const v = value as any;
    return String(v.text ?? v.name ?? '');
  }
  return '';
};

const getEnvOrDefault = (envKey: string, fallback: string) => {
  const envValue = process.env[envKey];
  if (envValue && !envValue.includes('your_') && !envValue.includes('YOUR_')) {
    return envValue.replace(/[\r\n\s]+/g, '');
  }
  return (fallback || '').replace(/[\r\n\s]+/g, '');
};

const getShortlinkTableId = async (appToken: string, appId: string, appSecret: string) => {
  const token = await getTenantAccessToken(appId, appSecret);
  const tableName = 'ShortLinks';

  const listResponse = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables?page_size=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
  const listJson = await listResponse.json();
  if (listJson.code !== 0) {
    throw new Error(listJson.msg || 'Failed to list tables');
  }

  const existing = (listJson.data?.items || []).find((t: any) => t?.name === tableName);
  if (existing?.table_id) return existing.table_id as string;

  const createResponse = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      table: {
        name: tableName,
        default_view_name: '表格视图',
        fields: [
          { field_name: 'code', type: 1 },
          { field_name: 'data', type: 1 },
          { field_name: 'expiresAt', type: 1 },
        ],
      },
    }),
  });
  const createJson = await createResponse.json();
  if (createJson.code !== 0) {
    throw new Error(createJson.msg || 'Failed to create table');
  }
  return createJson.data?.table_id as string;
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

    const appId = getEnvOrDefault('FEISHU_APP_ID', FEISHU_CONFIG.APP_ID);
    const appSecret = getEnvOrDefault('FEISHU_APP_SECRET', FEISHU_CONFIG.APP_SECRET);
    const appToken = getEnvOrDefault('FEISHU_APP_TOKEN', FEISHU_CONFIG.APP_TOKEN);
    if (!appId || !appSecret || !appToken) {
      return NextResponse.json({ error: 'Missing FEISHU config' }, { status: 500 });
    }

    const tableId = await getShortlinkTableId(appToken, appId, appSecret);

    let code = '';
    for (let i = 0; i < 5; i++) {
      code = toBase62(randomBytes(10));
      const exists = await searchRecordItemsFromBitable(
        appToken,
        tableId,
        { conjunction: 'and', conditions: [{ field_name: 'code', operator: 'is', value: [code] }] },
        appId,
        appSecret
      );
      if (!exists || exists.length === 0) break;
    }
    if (!code) {
      return NextResponse.json({ error: 'Failed to allocate code' }, { status: 500 });
    }

    const expiresAt = String(now() + TTL_MS);
    await addRecordToBitable(appToken, tableId, [{ code, data, expiresAt }], appId, appSecret);
    for (let i = 0; i < 5; i++) {
      const items = await searchRecordItemsFromBitable(
        appToken,
        tableId,
        { conjunction: 'and', conditions: [{ field_name: 'code', operator: 'is', value: [code] }] },
        appId,
        appSecret
      );
      if (items && items.length > 0) break;
      await sleep(150 * (i + 1));
    }
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

    const appId = getEnvOrDefault('FEISHU_APP_ID', FEISHU_CONFIG.APP_ID);
    const appSecret = getEnvOrDefault('FEISHU_APP_SECRET', FEISHU_CONFIG.APP_SECRET);
    const appToken = getEnvOrDefault('FEISHU_APP_TOKEN', FEISHU_CONFIG.APP_TOKEN);
    if (!appId || !appSecret || !appToken) {
      return NextResponse.json({ error: 'Missing FEISHU config' }, { status: 500 });
    }

    const tableId = await getShortlinkTableId(appToken, appId, appSecret);
    let items: any[] = [];
    for (let i = 0; i < 5; i++) {
      items = await searchRecordItemsFromBitable(
        appToken,
        tableId,
        { conjunction: 'and', conditions: [{ field_name: 'code', operator: 'is', value: [code] }] },
        appId,
        appSecret
      );
      if (items && items.length > 0) break;
      await sleep(120 * (i + 1));
    }
    if (!items || items.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const fields = items[0]?.fields || {};
    const data = toText(fields.data);
    const expiresAtRaw = toText(fields.expiresAt);
    const expiresAt = Number(expiresAtRaw || '0');
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (expiresAt && expiresAt <= now()) {
      return NextResponse.json({ error: 'Expired' }, { status: 410 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
