import { NextResponse } from 'next/server';
import { addRecordToBitable } from '@/lib/feishu';
import { SessionWithSamples } from '@/lib/types';
import { FEISHU_CONFIG } from '@/lib/feishu-config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session } = body;
    const clientConfig = body.config || {};

    console.log("Sync request received. Session:", session?.id, "Type:", session?.type);
    console.log("Environment check:", {
      hasInternalTableId: !!process.env.FEISHU_TABLE_ID,
      hasEventTableId: !!process.env.FEISHU_EVENT_TABLE_ID,
      envInternalTableId: process.env.FEISHU_TABLE_ID ? process.env.FEISHU_TABLE_ID.slice(0, 5) + '...' : 'null',
      envEventTableId: process.env.FEISHU_EVENT_TABLE_ID ? process.env.FEISHU_EVENT_TABLE_ID.slice(0, 5) + '...' : 'null',
    });
    
    // Use environment variables OR client provided config OR hardcoded defaults
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
    
    console.log("--- DEBUG INFO ---");
    console.log(`App ID: ${appId} (Length: ${appId.length})`);
    console.log(`App Secret: ${appSecret.substring(0, 4)}***${appSecret.substring(appSecret.length - 4)} (Length: ${appSecret.length})`);
    console.log("--- DEBUG END ---");
    
    // Determine Table ID based on Session Type
    // Default to Internal Table
    let tableId = getEnvOrConfig('FEISHU_TABLE_ID', FEISHU_CONFIG.INTERNAL_TABLE_ID);
    
    // Explicitly handle 'event' type
    if (session?.type === 'event') {
      // Prioritize environment variable if set, otherwise use config default
      const envEventTableId = getEnvOrConfig('FEISHU_EVENT_TABLE_ID', FEISHU_CONFIG.EVENT_TABLE_ID);
      tableId = envEventTableId;
      console.log(`[Sync Debug] Event Type Detected. Switching to Event Table ID: ${tableId}`);
    } 

    // Handle 'voting' template - Overrides everything else if set
    if (session?.template === 'voting') {
      const envVotingTableId = getEnvOrConfig('FEISHU_VOTING_TABLE_ID', FEISHU_CONFIG.VOTING_TABLE_ID);
      tableId = envVotingTableId;
      console.log(`[Sync Debug] Voting Template Detected. Switching to Voting Table ID: ${tableId}`);
    }

    if (!session?.template || session?.template !== 'voting') {
        console.log(`[Sync Debug] Internal/Default/Event Type Detected. Using Table ID: ${tableId}`);
    }
    
    console.log(`[Sync Debug] Session Type: ${session?.type}, Template: ${session?.template}, Selected Table ID: ${tableId}`);

    if (!session || !appId || !appSecret || !appToken || !tableId) {
      console.error("Missing config:", { hasSession: !!session, hasAppId: !!appId, hasAppSecret: !!appSecret, hasAppToken: !!appToken, hasTableId: !!tableId });
      return NextResponse.json({ error: 'Missing configuration. Please check server environment variables.' }, { status: 500 });
    }

    let records;
    if (session.template === 'voting') {
        records = (session as SessionWithSamples).samples.map(sample => {
            const score = sample.score;
            // Handle both new voteScore and legacy isFavorite
            const numericScore = score?.voteScore ? score.voteScore : (score?.isFavorite ? 3 : 0);
            
            // Fix: ensure cupperName is taken from client config if score doesn't have it (e.g. untouched sample)
            const cupperName = score?.cupperName || clientConfig?.cupperName || "匿名";
            
            return {
                "杯测名称": session.name,
                "样品名称": sample.name,
                "投票人": cupperName,
                "喜好度": numericScore, // New numeric field (1, 2, 3). Requires Feishu table schema update
                "是否喜欢": numericScore > 0 ? "是" : "", // Legacy field
                "评语": score?.notes || "",
                "投票时间": new Date().getTime(), // Or score?.createdAt if available
            };
        });
        
        // Remove empty records where user didn't vote and didn't leave a note
        records = records.filter(r => r["喜好度"] > 0 || r["评语"].trim() !== "");
    } else {
        // Standard Scoring Sync
        records = (session as SessionWithSamples).samples.map(sample => {
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
                "处理法": sample.process,
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
                "风味笔记": (session.type === 'event' ? "【展会活动】" : "") + (score?.notes || ""),
                "缺陷记录": score?.defects ? JSON.stringify(score.defects) : "",
                "创建时间": new Date().getTime(),
            };
        });
    }

    const result = await addRecordToBitable(appToken, tableId, records, appId, appSecret);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Sync error:', error);
    let errorMessage = error.message || 'Internal Server Error';
    if (errorMessage.includes('FieldNameNotFound')) {
      errorMessage = '同步失败：飞书表格中缺少必要字段。请确保表格包含“样品类型”、“处理法”等列，且名称完全一致。';
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
