"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSessions } from '@/lib/context';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Coffee, Loader2 } from 'lucide-react';
import Link from 'next/link';

function JoinSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addSession } = useSessions();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    const data = searchParams.get('data');
    if (!data) {
      setError('无效的分享链接：缺少数据');
      setIsProcessing(false);
      return;
    }

    try {
      // Use UTF-8 safe decoding
      const decoded = JSON.parse(decodeURIComponent(atob(data)));
      setSessionData(decoded);
      setIsProcessing(false);
    } catch (e) {
      console.error("Failed to parse session data:", e);
      setError('无效的分享链接：数据解析失败');
      setIsProcessing(false);
    }
  }, [searchParams]);

  const handleJoin = async () => {
    if (!sessionData) return;
    
    setIsProcessing(true);
    try {
      // Create a new session based on shared data
      // Generate new IDs to avoid conflicts, but keep content
      const sessionId = uuidv4();
      const newSession = {
        id: sessionId,
        name: sessionData.name,
        cuppingDate: sessionData.cuppingDate || new Date().toISOString(),
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        samples: (sessionData.samples || []).map((s: any) => ({
          id: uuidv4(),
          sessionId: sessionId,
          name: s.name,
          origin: s.origin,
          process: s.process,
          type: s.type || 'pre_shipment',
          createdAt: new Date().toISOString(),
          // Don't copy scores
        })),
      };

      await addSession(newSession);
      router.push(`/session/${sessionId}`);
    } catch (err) {
      console.error("Failed to create session:", err);
      setError('创建会话失败，请重试');
      setIsProcessing(false);
    }
  };

  if (isProcessing && !sessionData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
        <p className="text-gray-500">正在解析会话数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <Coffee className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">无法加入会话</h2>
        <p className="text-gray-500">{error}</p>
        <Link 
          href="/"
          className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Coffee className="w-8 h-8 text-amber-700" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">加入杯测会话</h1>
        <p className="text-gray-500">您即将加入以下杯测活动</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">会话名称</label>
          <div className="text-lg font-medium text-gray-900">{sessionData.name}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">日期</label>
            <div className="text-sm text-gray-900">
              {new Date(sessionData.cuppingDate).toLocaleDateString()}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">样品数量</label>
            <div className="text-sm text-gray-900">{sessionData.samples?.length || 0} 个样品</div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">样品预览</label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {sessionData.samples?.map((s: any, i: number) => (
              <div key={i} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                {i + 1}. {s.name} <span className="text-gray-400">({s.origin})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleJoin}
          disabled={isProcessing}
          className="w-full py-3 bg-amber-700 text-white rounded-xl font-bold hover:bg-amber-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {isProcessing ? '正在创建...' : '确认加入并开始打分'}
        </button>
        <Link 
          href="/"
          className="block w-full py-3 text-center text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
        >
          取消
        </Link>
      </div>
    </div>
  );
}

export default function JoinSessionPage() {
  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8 flex items-center justify-center">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700" />
          <p className="text-gray-500">加载中...</p>
        </div>
      }>
        <JoinSessionContent />
      </Suspense>
    </div>
  );
}
