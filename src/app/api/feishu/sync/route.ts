import { NextResponse } from 'next/server';
import { addRecordToBitable } from '@/lib/feishu';
import { SessionWithSamples } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { session, appToken, tableId, appId, appSecret } = await request.json();

    if (!session || !appToken || !tableId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const records = (session as SessionWithSamples).samples.map(sample => {
      const score = sample.score;
      return {
        "杯测名称": session.name, // Mapped to session name (was "杯测活动")
        "杯测日期": new Date(session.cuppingDate).getTime(), // Feishu date format usually timestamp
        "样品类型": sample.type === 'pre_shipment' ? '货前样' :
                   sample.type === 'processing' ? '加工样' :
                   sample.type === 'arrival' ? '到货样' :
                   sample.type === 'sales' ? '可销售样' :
                   sample.type === 'self_drawn' ? '自抽样' :
                   sample.type === 'other' ? '其他' : sample.type || '',
        "样品名称": sample.name,
        "产地": sample.origin,
        "处理方式": sample.process,
        "杯测人": score?.cupperName || "", // Added cupper name
        "香气": score?.fragrance || 0,
        "风味": score?.flavor || 0,
        "余韵": score?.aftertaste || 0,
        "酸度": score?.acidity || 0,
        "醇厚度": score?.body || 0,
        "平衡度": score?.balance || 0,
        "一致性": score?.uniformity || 0,
        "干净度": score?.cleanCup || 0,
        "甜度": score?.sweetness || 0,
        "总分": score?.totalScore || 0,
        "风味笔记": score?.notes || "",
        "缺陷记录": score?.defects ? JSON.stringify(score.defects) : "",
        "创建时间": new Date().getTime(),
      };
    });

    const result = await addRecordToBitable(appToken, tableId, records, appId, appSecret);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
