import { NextResponse } from 'next/server';
import { addRecordToBitable } from '@/lib/feishu';
import { GlobalSample } from '@/lib/types';
import { FEISHU_CONFIG } from '@/lib/feishu-config';

export async function POST(request: Request) {
  try {
    const { sampleTableId: customSampleTableId, samples } = await request.json();

    // Priority: Request Body > Env Var > Default Hardcoded
    // Explicitly check for empty strings to ensure fallback works and trim whitespace
    const getEnvOrConfig = (envKey: string, configValue: string) => {
      const envValue = process.env[envKey];
      // Check if envValue is set AND not a placeholder
      if (envValue && !envValue.includes('your_') && !envValue.includes('YOUR_')) {
        return envValue.replace(/[\r\n\s]+/g, '');
      }
      return configValue.replace(/[\r\n\s]+/g, '');
    };

    const appId = getEnvOrConfig('FEISHU_APP_ID', FEISHU_CONFIG.APP_ID);
    const appSecret = getEnvOrConfig('FEISHU_APP_SECRET', FEISHU_CONFIG.APP_SECRET);
    const appToken = getEnvOrConfig('FEISHU_APP_TOKEN', FEISHU_CONFIG.APP_TOKEN);
    
    const sampleTableId = (customSampleTableId || getEnvOrConfig('FEISHU_SAMPLE_TABLE_ID', FEISHU_CONFIG.SAMPLE_TABLE_ID));

    console.log(`[Sync Samples] Using App ID: ${appId.slice(0, 5)}...`);
    console.log(`[Sync Samples] Using Table ID: ${sampleTableId}`);
    console.log(`[Sync Samples] Sample Count: ${samples?.length}`);

    if (!appId || !appSecret || !appToken) {
        return NextResponse.json({ error: 'Server configuration error: Missing Feishu credentials' }, { status: 500 });
    }

    if (!sampleTableId) {
      return NextResponse.json({ error: '请在设置中配置样品表 ID (sampleTableId) 或联系管理员配置环境变量' }, { status: 400 });
    }
    
    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return NextResponse.json({ error: 'No samples to sync' }, { status: 400 });
    }
    
    const records = (samples as GlobalSample[]).map(sample => ({
      "样品名称": sample.name,
      "产地": sample.origin || "",
      "处理法": sample.process || "",
      "豆种": sample.variety || "",
      "瑕疵率": sample.defectRate || "",
      "水分": sample.moisture || "",
      "水活性": sample.waterActivity || "",
      "目数": sample.screenSize || "",
      "产季": sample.cropYear || "",
      "提供商": sample.supplier || "",
      "样品类型": sample.type === 'pre_shipment' ? '货前样' :
                 sample.type === 'processing' ? '加工样' :
                 sample.type === 'arrival' ? '到货样' :
                 sample.type === 'sales' ? '可销售样' :
                 sample.type === 'self_drawn' ? '自抽样' :
                 sample.type === 'other' ? '其他' : (sample.type || ""),
      "创建时间": new Date(sample.createdAt).getTime(),
    }));

    // Pass the hardcoded credentials to the helper function
    const result = await addRecordToBitable(appToken, sampleTableId, records, appId, appSecret);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Sync samples error:", error);
    let errorMessage = error.message || "Unknown error";
    if (errorMessage.includes('TextFieldConvFail')) {
      errorMessage = '同步失败：字段类型转换错误。请检查飞书表格中各列的类型设置（例如“创建时间”应为日期类型，其他多为文本类型）。';
    } else if (errorMessage.includes('FieldNameNotFound')) {
      errorMessage = '同步失败：飞书表格中缺少必要字段。请确保表格包含所有必要列且名称一致。';
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
