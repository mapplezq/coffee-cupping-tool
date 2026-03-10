"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSessions } from '@/lib/context';
import { SessionWithSamples, CuppingScore } from '@/lib/types';
import ScoringForm from '@/components/ScoringForm';
import SettingsModal from '@/components/SettingsModal';
import { ArrowLeft, RefreshCw, CheckCircle, Settings, Share2, X, Eye, EyeOff, ChevronLeft, ChevronRight, Copy, Image as ImageIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { QRCodeSVG } from 'qrcode.react';
import LZString from 'lz-string';
import QRCode from 'qrcode';

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
  const [showBlindMap, setShowBlindMap] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const sessionId = params.id as string;

  const getShareUrl = () => {
    if (!session) return '';
    const shareData = {
      name: session.name,
      cuppingDate: session.cuppingDate,
      blindMode: session.blindMode, // Include blind mode settings
      blindLabelType: session.blindLabelType,
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
        {/* Image Preview Modal for Mobile/WeChat */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute top-4 right-4">
            <button 
              onClick={() => setPreviewImage(null)}
              className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center w-full max-w-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={previewImage} 
              alt="Share Preview" 
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
            />
          </div>
          
          <div className="mt-4 text-center text-white/80 space-y-1">
            <p className="font-medium text-lg text-white flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" />
              长按上方图片发送给朋友
            </p>
            <p className="text-sm">或保存到手机相册</p>
          </div>
        </div>
      )}
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleShareAsImage = async () => {
    if (!session) return;
    setIsGeneratingImage(true);
    
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Set canvas size (e.g. 800px width, dynamic height)
      const width = 800;
      const padding = 60;
      const headerHeight = 160;
      const infoHeight = 140;
      const qrSize = 360;
      const footerHeight = 80;
      const height = headerHeight + infoHeight + qrSize + footerHeight + padding * 2;

      canvas.width = width;
      canvas.height = height;

      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Draw Title
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(session.name, width / 2, padding + 60);

      // Draw Date
      ctx.fillStyle = '#6b7280';
      ctx.font = '28px sans-serif';
      ctx.fillText(new Date(session.cuppingDate).toLocaleDateString(), width / 2, padding + 110);

      // Draw Separator
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(padding, padding + headerHeight);
      ctx.lineTo(width - padding, padding + headerHeight);
      ctx.stroke();

      // Draw Info Rows
      ctx.textAlign = 'left';
      ctx.font = '32px sans-serif';
      
      // Sample Count
      ctx.fillStyle = '#6b7280';
      ctx.fillText('样品数量', padding, padding + headerHeight + 60);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(`${session.samples.length} 支`, width - padding, padding + headerHeight + 60);

      // Mode
      ctx.textAlign = 'left';
      ctx.fillStyle = '#6b7280';
      ctx.font = '32px sans-serif';
      ctx.fillText('模式', padding, padding + headerHeight + 110);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#d97706'; // Amber color
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(session.blindMode ? '盲测 (Blind)' : '公开 (Open)', width - padding, padding + headerHeight + 110);

      // Draw Separator
      ctx.strokeStyle = '#f3f4f6';
      ctx.beginPath();
      ctx.moveTo(padding, padding + headerHeight + infoHeight);
      ctx.lineTo(width - padding, padding + headerHeight + infoHeight);
      ctx.stroke();

      // Generate QR Code
      const qrCanvas = document.createElement('canvas');
      try {
        await QRCode.toCanvas(qrCanvas, getShareUrl(), { margin: 2, width: qrSize, color: { dark: '#000000', light: '#ffffff' } });
      } catch (qrError) {
        throw new Error('Failed to generate QR code: ' + String(qrError));
      }
      
      // Draw QR Code centered
      const qrX = (width - qrSize) / 2;
      const qrY = padding + headerHeight + infoHeight + 30;
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // Draw Footer Text
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9ca3af';
      ctx.font = '20px sans-serif';
      ctx.fillText('使用 Coffee Cupping Tool 扫码或访问链接加入', width / 2, height - padding);

      // --- Optimized Sharing Logic ---
      
      // 1. Data URL
      const dataUrl = canvas.toDataURL('image/png');

      // 2. Logic Branch: Force preview modal for all environments temporarily to debug
      // This ensures user always sees the image, regardless of browser capabilities
      setPreviewImage(dataUrl);

    } catch (err) {
      console.error('Failed to generate image:', err);
      alert('生成图片失败: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopyLink = () => {
    if (!session) return;
    const url = getShareUrl();
    const text = `☕️ 邀请您参加杯测会话\n\n📅 主题：${session.name}\n🕒 日期：${new Date(session.cuppingDate).toLocaleDateString()}\n🧪 样品数：${session.samples.length}支\n${session.blindMode ? '🕶️ 模式：盲测' : '📝 模式：公开'}\n\n👇 点击链接或保存二维码加入：\n${url}`;
    
    navigator.clipboard.writeText(text);
    alert('分享文案已复制！可直接粘贴发送给好友。');
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
        <div className="flex flex-col gap-4">
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

          {/* Blind Mode Sample Map (Collapsible) */}
          {session.blindMode && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowBlindMap(!showBlindMap)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  {showBlindMap ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                  {showBlindMap ? '隐藏样品对照表' : '查看样品对照表 (准备阶段)'}
                </div>
                <span className="text-xs text-gray-500">
                  {showBlindMap ? '点击折叠' : '点击展开查看真实样品信息'}
                </span>
              </button>
              
              {showBlindMap && (
                <div className="p-4 border-t border-gray-100 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {session.samples.map((sample, index) => (
                      <div key={sample.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm shrink-0">
                          {getSampleLabel(sample, index)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{sample.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {sample.origin} · {sample.process}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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

      {/* Sticky Bottom Navigation */}
      {session.samples.length > 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40 safe-area-bottom">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <button
              onClick={() => activeSampleIndex > 0 && handleSampleSwitch(session.samples[activeSampleIndex - 1].id)}
              disabled={activeSampleIndex <= 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-amber-700 disabled:opacity-30 disabled:hover:text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">上一个</span>
            </button>
            
            <div className="text-sm font-medium text-gray-500">
              {activeSampleIndex + 1} / {session.samples.length}
            </div>

            <button
              onClick={() => activeSampleIndex < session.samples.length - 1 && handleSampleSwitch(session.samples[activeSampleIndex + 1].id)}
              disabled={activeSampleIndex >= session.samples.length - 1}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-amber-700 disabled:opacity-30 disabled:hover:text-gray-600 transition-colors"
            >
              <span className="font-medium">下一个</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200 my-8">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">邀请杯测师加入</h2>
              <button onClick={() => setIsShareOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 flex flex-col items-center">
              {/* Share Card Area */}
              <div 
                id="share-card" 
                className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm w-full space-y-4"
                style={{ backgroundColor: '#ffffff', color: '#000000' }}
              >
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-lg" style={{ color: '#111827' }}>{session.name}</h3>
                  <p className="text-sm" style={{ color: '#6b7280' }}>{new Date(session.cuppingDate).toLocaleDateString()}</p>
                </div>

                <div className="border-t border-b border-gray-100 py-4 space-y-2" style={{ borderColor: '#f3f4f6' }}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#6b7280' }}>样品数量</span>
                    <span className="font-medium" style={{ color: '#111827' }}>{session.samples.length} 支</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#6b7280' }}>模式</span>
                    <span className="font-medium" style={{ color: '#d97706' }}>
                      {session.blindMode ? '盲测 (Blind)' : '公开 (Open)'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center py-2">
                  <div className="p-2 bg-white rounded-lg border border-gray-100" style={{ backgroundColor: '#ffffff', borderColor: '#f3f4f6' }}>
                    <QRCodeSVG value={getShareUrl()} size={180} />
                  </div>
                </div>
                
                <p className="text-center text-xs" style={{ color: '#9ca3af' }}>
                  使用 Coffee Cupping Tool 扫码或访问链接加入
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={handleShareAsImage}
                  disabled={isGeneratingImage}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isGeneratingImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  {isGeneratingImage ? '生成中...' : '保存图片'}
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  复制文案
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
