import { NextResponse } from 'next/server';
import { getTenantAccessToken } from '@/lib/feishu';

export async function POST(request: Request) {
  try {
    const { appToken, tableId, appId, appSecret } = await request.json();

    if (!appToken || !tableId || !appId || !appSecret) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Test Tenant Access Token
    const token = await getTenantAccessToken(appId, appSecret);

    // 2. Test Table Access (Try to list records, limit 1)
    const response = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=1`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`Connection failed: ${data.msg}`);
    }

    return NextResponse.json({ success: true, message: 'Connection successful' });
  } catch (error: any) {
    console.error('Test connection error:', error);
    return NextResponse.json({ error: error.message || 'Test failed' }, { status: 500 });
  }
}