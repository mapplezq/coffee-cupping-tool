"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSessions } from '@/lib/context';
import { SessionWithSamples, CuppingScore } from '@/lib/types';
import ScoringForm from '@/components/ScoringForm';
import SettingsModal from '@/components/SettingsModal';
import { ArrowLeft, RefreshCw, CheckCircle, Settings, Share2, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import LZString from 'lz-string';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { sessions, loading, updateSession } = useSessions();
  const [session, setSession] = useState<SessionWithSamples | null>(null);
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [dirtySampleId, setDirtySampleId] = useState<string | null>(null);

  const sessionId = params.id as string;

  const getShareUrl = () => {
    if (!session) return '';
    const shareData = {
      name: session.name,
      cuppingDate: session.cuppingDate,
      samples: session.samples.map(s => ({
        name: s.name,
        origin: s.origin,
        process: s.process,
        type: s.type
      }))
    };
    // Use LZString to compress data for shorter URL
    const jsonString = JSON.stringify(shareData);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    const baseUrl = window.location.origin;
    return `${baseUrl}/session/join?data=${compressed}`;
  };

  useEffect(() => {
    if (!loading && sessionId) {
      const found = sessions.find(s => s.id === sessionId);
      if (found) {
        setSession(found);
        if (!activeSampleId && found.samples.length > 0) {
          setActiveSampleId(found.samples[0].id);
        }
      } else {
        // Redirect if not found? Or just show error
      }
    }
  }, [sessions, loading, sessionId, activeSampleId]);

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const activeSample = session.samples.find(s => s.id === activeSampleId);
  const activeSampleIndex = session.samples.findIndex(s => s.id === activeSampleId);

  const getSampleLabel = (sample: SessionWithSamples['samples'][0], index: number) => {
    if (!session.blindMode) return sample.name;
    if (session.blindLabelType === 'number') return `${index + 1}`;
    // A, B, C...
    return String.fromCharCode(65 + index);
  };

  const handleSampleSwitch = (newSampleId: string) => {
    if (dirtySampleId && dirtySampleId !== newSampleId) {
      if (!confirm('当前样品的评分尚未保存，切换样品将丢失未保存的更改。确定要切换吗？')) {
        return;
      }
      setDirtySampleId(null); // Reset dirty state if user confirms switch
    }
    setActiveSampleId(newSampleId);
  };

  const handleSaveScore = async (scoreData: Omit<CuppingScore, 'id' | 'sampleId' | 'createdAt' | 'cupperName'>) => {
    if (!activeSample) return;
    setIsSaving(true);
    try {
      // Get cupper name from local storage
      const savedConfig = localStorage.getItem('feishu_config');
      const config = savedConfig ? JSON.parse(savedConfig) : {};
      const cupperName = config.cupperName || 'Unknown';

      const updatedSample = {
        ...activeSample,
        score: {
          ...activeSample.score, // keep existing id/createdAt if exists
          id: activeSample.score?.id || uuidv4(),
          sampleId: activeSample.id,
          createdAt: activeSample.score?.createdAt || new Date().toISOString(),
          cupperName,
          ...scoreData,
        } as CuppingScore
      };

      const updatedSession = {
        ...session,
        updatedAt: new Date().toISOString(),
        samples: session.samples.map(s => s.id === activeSample.id ? updatedSample : s)
      };

      await updateSession(updatedSession);
      
      // Update local state immediately to reflect changes
      setSession(updatedSession);
      setDirtySampleId(null); // Clear dirty state after save

    } catch (error) {
      console.error("Failed to save score:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const executeSync = async () => {
    setIsSyncing(true);
    try {
      const savedConfig = localStorage.getItem('feishu_config');
      const config = savedConfig ? JSON.parse(savedConfig) : {};
      
      const appToken = config.appToken || process.env.NEXT_PUBLIC_FEISHU_APP_TOKEN;
      const tableId = config.tableId || process.env.NEXT_PUBLIC_FEISHU_TABLE_ID;
      const appId = config.appId;
      const appSecret = config.appSecret;

      if (!appToken || !tableId) {
        throw new Error('请先配置飞书同步信息（点击右上角设置图标）');
      }

      const response = await fetch('/api/feishu/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          appToken,
          tableId,
          appId,
          appSecret,
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      // Update session status
      const syncedSession = {
        ...session,
        status: 'synced' as const,
        updatedAt: new Date().toISOString()
      };
      await updateSession(syncedSession);
      setSession(syncedSession);
      alert('同步成功！');
    } catch (error: any) {
      console.error("Sync error:", error);
      alert(`同步失败: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    // Validation: Check for unsaved changes
    if (dirtySampleId) {
      alert('您有未保存的评分，请先保存当前样品的评分后再同步。');
      return;
    }

    // Validation: Check for missing scores
    const missingScores = session?.samples.filter(s => !s.score);
    if (missingScores && missingScores.length > 0) {
      const message = `以下样品尚未评分：\n${missingScores.map(s => s.name).join('\n')}\n\n确定要继续同步吗？未评分的样品将不会包含评分数据。`;
      if (!window.confirm(message)) {
        return; // Stop execution if user cancels
      }
    }

    // Proceed to sync
    await executeSync();
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8 pb-24">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>杯测日期: {new Date(session.cuppingDate).toLocaleDateString()}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  session.status === 'synced' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {session.status === 'completed' ? '已完成' :
                   session.status === 'synced' ? '已同步' : '草稿'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsShareOpen(true)}
              className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition-colors"
              title="分享会话"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {session.status === 'synced' ? '重新同步至飞书' : '同步至飞书'}
            </button>
          </div>
        </div>

        {/* Sample Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex overflow-x-auto p-2 gap-2 bg-gray-50/50">
            {session.samples.map((sample, index) => (
              <button
                key={sample.id}
                onClick={() => handleSampleSwitch(sample.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2",
                  activeSampleId === sample.id
                    ? "bg-white text-amber-700 shadow-sm ring-1 ring-gray-200"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {getSampleLabel(sample, index)}
                {sample.score && <CheckCircle className="w-3 h-3 text-green-500" />}
              </button>
            ))}
          </div>
          
          <div className="p-6">
             {activeSample ? (
               <div className="space-y-6">
                 {/* Blind mode info or full details */}
                 <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                   {session.blindMode ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-500 text-sm block">当前样品</span>
                          <span className="text-2xl font-bold text-gray-900">{getSampleLabel(activeSample, activeSampleIndex)}</span>
                        </div>
                        <div className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                          盲测模式
                        </div>
                      </div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                       <div>
                         <span className="text-gray-500 block">产地</span>
                         <span className="font-medium text-gray-900">{activeSample.origin}</span>
                       </div>
                       <div>
                         <span className="text-gray-500 block">处理法</span>
                         <span className="font-medium text-gray-900">{activeSample.process}</span>
                       </div>
                       <div>
                         <span className="text-gray-500 block">样品类型</span>
                         <span className="font-medium text-gray-900">
                          {
                            activeSample.type === 'pre_shipment' ? '货前样' :
                            activeSample.type === 'processing' ? '加工样' :
                            activeSample.type === 'arrival' ? '到货样' :
                            activeSample.type === 'sales' ? '可销售样' :
                            activeSample.type === 'self_drawn' ? '自抽样' :
                            activeSample.type === 'other' ? '其他' : 
                            activeSample.type || '-'
                          }
                         </span>
                       </div>
                     </div>
                   )}
                 </div>

                 <ScoringForm 
                    key={activeSample.id} // Re-mount form when sample changes
                    sample={activeSample}
                    onSave={handleSaveScore}
                    isSaving={isSaving}
                    onDirtyChange={(isDirty) => setDirtySampleId(isDirty ? activeSample.id : null)}
                 />
               </div>
             ) : (
               <div className="text-center py-12 text-gray-500">请选择一个样品开始评分</div>
             )}
          </div>
        </div>

      </div>

      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">分享会话</h2>
              <button onClick={() => setIsShareOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100">
                <QRCodeSVG value={getShareUrl()} size={200} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-500">让其他杯测师扫描二维码加入</p>
                <p className="text-xs text-gray-400 break-all px-4 hidden">
                  {getShareUrl()}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getShareUrl());
                  alert('链接已复制到剪贴板');
                }}
                className="w-full py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg font-medium transition-colors border border-amber-200"
              >
                复制分享链接
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
