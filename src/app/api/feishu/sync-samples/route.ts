import { NextResponse } from 'next/server';
import { addRecordToBitable } from '@/lib/feishu';
import { GlobalSample } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { appId, appSecret, appToken, sampleTableId, samples } = await request.json();

    if (!sampleTableId) {
      return NextResponse.json({ error: '请在设置中配置样品表 ID (sampleTableId)' }, { status: 400 });
    }

    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return NextResponse.json({ error: 'No samples to sync' }, { status: 400 });
    }
    
    const records = (samples as GlobalSample[]).map(sample => ({
      "样品名称": sample.name,
      "产地": sample.origin,
      "处理法": sample.process,
      "豆种": sample.variety,
      "瑕疵率": sample.defectRate,
      "水分": sample.moisture,
      "水活性": sample.waterActivity,
      "目数": sample.screenSize,
      "产季": sample.cropYear,
      "提供商": sample.supplier,
      "样品类型": sample.type === 'pre_shipment' ? '货前样' :
                 sample.type === 'processing' ? '加工样' :
                 sample.type === 'arrival' ? '到货样' :
                 sample.type === 'sales' ? '可销售样' :
                 sample.type === 'self_drawn' ? '自抽样' :
                 sample.type === 'other' ? '其他' : sample.type,
      "创建时间": new Date(sample.createdAt).getTime(),
    }));

    const result = await addRecordToBitable(appToken, sampleTableId, records, appId, appSecret);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Sync samples error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
