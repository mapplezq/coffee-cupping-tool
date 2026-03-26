import { NextResponse } from 'next/server';
import { getTenantAccessToken } from '@/lib/feishu';
import { getRecordsFromBitable } from '@/lib/feishu';
import { FEISHU_CONFIG } from '@/lib/feishu-config';

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionName = searchParams.get('sessionName');
    
    if (!sessionName) {
      return NextResponse.json({ error: 'Provide ?sessionName=YOUR_SESSION_NAME' }, { status: 400 });
    }

    const getEnvOrConfig = (envKey: string, configValue: string) => {
      const envValue = process.env[envKey];
      if (envValue && !envValue.includes('your_') && !envValue.includes('YOUR_')) {
        return envValue.replace(/[\r\n\s]+/g, '');
      }
      return configValue.replace(/[\r\n\s]+/g, '');
    };

    const appId = getEnvOrConfig('FEISHU_APP_ID', FEISHU_CONFIG.APP_ID);
    const appSecret = getEnvOrConfig('FEISHU_APP_SECRET', FEISHU_CONFIG.APP_SECRET);
    const appToken = getEnvOrConfig('FEISHU_APP_TOKEN', FEISHU_CONFIG.APP_TOKEN);
    // Use voting table ID for debugging
    const tableId = getEnvOrConfig('FEISHU_VOTING_TABLE_ID', FEISHU_CONFIG.VOTING_TABLE_ID);

    const records = await getRecordsFromBitable(appToken, tableId, sessionName, appId, appSecret);

    return NextResponse.json({ 
        success: true, 
        count: records.length,
        firstRecord: records[0] || null,
        allKeys: records[0] ? Object.keys(records[0]) : [],
        rawRecords: records
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}