import { NextResponse } from 'next/server';
import { getTenantAccessToken } from '@/lib/feishu';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableId: customTableId } = body;

    // Use environment variables, fallback to request body
    const appId = process.env.FEISHU_APP_ID || body.appId;
    const appSecret = process.env.FEISHU_APP_SECRET || body.appSecret;
    const appToken = process.env.FEISHU_APP_TOKEN || body.appToken;
    const tableId = customTableId || process.env.FEISHU_TABLE_ID || body.tableId;

    if (!appToken || !tableId || !appId || !appSecret) {
      return NextResponse.json({ error: 'Missing required configuration (Check server env vars)' }, { status: 400 });
    }

    // 2. Test Table Access (Try to list records, limit 1)
    const token = await getTenantAccessToken(appId, appSecret);
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