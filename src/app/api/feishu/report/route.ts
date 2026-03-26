import { NextResponse } from 'next/server';
import { getRecordsFromBitable } from '@/lib/feishu';
import { FEISHU_CONFIG } from '@/lib/feishu-config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionName, template, type, config } = body;

    if (!sessionName) {
      return NextResponse.json({ error: 'Missing sessionName' }, { status: 400 });
    }

    const getEnvOrConfig = (envKey: string, configValue: string) => {
      const envValue = process.env[envKey];
      if (envValue && !envValue.includes('your_') && !envValue.includes('YOUR_')) {
        return envValue.replace(/[\r\n\s]+/g, '');
      }
      return configValue.replace(/[\r\n\s]+/g, '');
    };

    const appId = getEnvOrConfig('FEISHU_APP_ID', config?.appId || FEISHU_CONFIG.APP_ID);
    const appSecret = getEnvOrConfig('FEISHU_APP_SECRET', config?.appSecret || FEISHU_CONFIG.APP_SECRET);
    const appToken = getEnvOrConfig('FEISHU_APP_TOKEN', config?.appToken || FEISHU_CONFIG.APP_TOKEN);

    let tableId = getEnvOrConfig('FEISHU_TABLE_ID', FEISHU_CONFIG.INTERNAL_TABLE_ID);

    if (type === 'event') {
      tableId = getEnvOrConfig('FEISHU_EVENT_TABLE_ID', FEISHU_CONFIG.EVENT_TABLE_ID);
    } 

    if (template === 'voting') {
      tableId = getEnvOrConfig('FEISHU_VOTING_TABLE_ID', FEISHU_CONFIG.VOTING_TABLE_ID);
    }

    if (!appId || !appSecret || !appToken || !tableId) {
      return NextResponse.json({ error: 'Missing configuration. Please check server environment variables.' }, { status: 500 });
    }

    const records = await getRecordsFromBitable(appToken, tableId, sessionName, appId, appSecret);

    // DEBUG: Log the first record to see the exact structure from Feishu
    console.log("Feishu Report Sync - First Record:", records.length > 0 ? JSON.stringify(records[0], null, 2) : "No records found");

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error('Fetch report error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
