const ENV_APP_ID = process.env.FEISHU_APP_ID;
const ENV_APP_SECRET = process.env.FEISHU_APP_SECRET;

export async function getTenantAccessToken(appId?: string, appSecret?: string) {
  const finalAppId = (appId || ENV_APP_ID || "").replace(/[\r\n\s]+/g, '');
  const finalAppSecret = (appSecret || ENV_APP_SECRET || "").replace(/[\r\n\s]+/g, '');

  if (!finalAppId || !finalAppSecret) {
    throw new Error("Missing FEISHU_APP_ID or FEISHU_APP_SECRET");
  }

  // Debug log (masked)
  console.log(`Getting Tenant Access Token. AppID: ${finalAppId.slice(0, 4)}... Length: ${finalAppId.length}`);

  const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      app_id: finalAppId,
      app_secret: finalAppSecret,
    }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get tenant access token: ${data.msg}`);
  }
  return data.tenant_access_token;
}

export async function addRecordToBitable(appToken: string, tableId: string, records: any[], appId?: string, appSecret?: string) {
  const token = await getTenantAccessToken(appId, appSecret);
  
  const BATCH_SIZE = 100;
  const results = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE).map(fields => ({ fields }));
    
    const response = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/batch_create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        records: batch,
      }),
    });

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`Failed to add records: ${data.msg}`);
    }
    results.push(data.data);
  }

  return results;
}

export async function getRecordsFromBitable(appToken: string, tableId: string, sessionName: string, appId?: string, appSecret?: string) {
  const token = await getTenantAccessToken(appId, appSecret);
  
  let allRecords: any[] = [];
  let pageToken = "";
  let hasMore = true;

  const filter = {
    conjunction: "and",
    conditions: [
      {
        field_name: "杯测名称",
        operator: "is",
        value: [sessionName]
      }
    ]
  };

  while (hasMore) {
    const response = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/search?page_size=100${pageToken ? `&page_token=${pageToken}` : ''}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        filter,
        automatic_fields: true
      }),
    });

    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`Failed to fetch records: ${data.msg}`);
    }

    if (data.data && data.data.items) {
      allRecords = allRecords.concat(data.data.items.map((item: any) => item.fields));
    }

    hasMore = data.data.has_more;
    pageToken = data.data.page_token;
  }

  return allRecords;
}
