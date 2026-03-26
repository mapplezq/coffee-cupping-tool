"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSessions } from '@/lib/context';
import { SessionWithSamples, CuppingScore } from '@/lib/types';
import ScoringForm from '@/components/ScoringForm';
import SettingsModal from '@/components/SettingsModal';
import { ArrowLeft, RefreshCw, CheckCircle, Settings, Share2, X, Eye, EyeOff, ChevronLeft, ChevronRight, Copy, BarChart3, ListChecks, Heart, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { cn, formatDate } from '@/lib/utils';
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
  const [showBlindMap, setShowBlindMap] = useState(false);

  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [cupperNameInput, setCupperNameInput] = useState('');

  const [expandedNotes, setExpandedNotes] = useState<string[]>([]);

  const toggleNote = (sampleId: string) => {
    setExpandedNotes(prev => 
      prev.includes(sampleId) ? prev.filter(id => id !== sampleId) : [...prev, sampleId]
    );
  };

  const handleVote = async (sample: SessionWithSamples['samples'][0], scoreValue: number) => {
    // Check if cupper name is configured
    const savedConfig = localStorage.getItem('feishu_config');
    const config = savedConfig ? JSON.parse(savedConfig) : {};
    
    if (!config.cupperName) {
      setIsNameModalOpen(true);
      return;
    }

    const currentScore = sample.score?.voteScore || 0;
    // Toggle off if clicking the same score, otherwise set to new score
    const newVoteScore = currentScore === scoreValue ? 0 : scoreValue;
    // For backwards compatibility and visual cues, if score > 0 it is a favorite
    const newFavoriteStatus = newVoteScore > 0;

    try {
      // Optimistic update
      const updatedSample = {
        ...sample,
        score: {
          ...sample.score,
          id: sample.score?.id || uuidv4(),
          sampleId: sample.id,
          createdAt: sample.score?.createdAt || new Date().toISOString(),
          cupperName: config.cupperName,
          isFavorite: newFavoriteStatus,
          voteScore: newVoteScore,
          notes: sample.score?.notes || '',
          // Correct field names based on types.ts
          fragrance: sample.score?.fragrance || 0,
          flavor: sample.score?.flavor || 0,
          aftertaste: sample.score?.aftertaste || 0,
          acidity: sample.score?.acidity || 0,
          body: sample.score?.body || 0,
          uniformity: sample.score?.uniformity || 0,
          balance: sample.score?.balance || 0,
          cleanCup: sample.score?.cleanCup || 0,
          sweetness: sample.score?.sweetness || 0,
          overall: sample.score?.overall || 0,
          defects: sample.score?.defects || [],
          totalScore: sample.score?.totalScore || 0,
        } as CuppingScore
      };

      if (!session) return; // Guard clause

      const updatedSession: SessionWithSamples = {
        ...session,
        updatedAt: new Date().toISOString(),
        samples: session.samples.map(s => s.id === sample.id ? updatedSample : s)
      };

      await updateSession(updatedSession);
      setSession(updatedSession);
    } catch (error) {
      console.error("Failed to toggle vote:", error);
      alert("操作失败，请重试");
    }
  };

  const handleResultsClick = () => {
    if (!session) return;
    if (session.template === 'voting') {
        const hasVotes = session.samples.some(s => (s.score?.voteScore || 0) > 0);
        if (!hasVotes) {
            alert('您还没有进行任何投票哦，快去给喜欢的样品点赞吧！');
            return;
        }
    }
    setIsResultModalOpen(true);
  };

  const handleVoteNoteChange = async (sample: SessionWithSamples['samples'][0], note: string) => {
    // Similar to handleVote but updates notes
     const savedConfig = localStorage.getItem('feishu_config');
     const config = savedConfig ? JSON.parse(savedConfig) : {};
    
    if (!config.cupperName) {
      // Should already be handled but just in case
      return;
    }

    try {
      const updatedSample = {
        ...sample,
        score: {
          ...sample.score,
          id: sample.score?.id || uuidv4(),
          sampleId: sample.id,
          createdAt: sample.score?.createdAt || new Date().toISOString(),
          cupperName: config.cupperName,
          isFavorite: sample.score?.isFavorite, // keep existing
          notes: note,
          // Correct field names
          fragrance: sample.score?.fragrance || 0,
          flavor: sample.score?.flavor || 0,
          aftertaste: sample.score?.aftertaste || 0,
          acidity: sample.score?.acidity || 0,
          body: sample.score?.body || 0,
          uniformity: sample.score?.uniformity || 0,
          balance: sample.score?.balance || 0,
          cleanCup: sample.score?.cleanCup || 0,
          sweetness: sample.score?.sweetness || 0,
          overall: sample.score?.overall || 0,
          defects: sample.score?.defects || [],
          totalScore: sample.score?.totalScore || 0,
        } as CuppingScore
      };

      if (!session) return; // Guard clause

      const updatedSession: SessionWithSamples = {
        ...session,
        updatedAt: new Date().toISOString(),
        samples: session.samples.map(s => s.id === sample.id ? updatedSample : s)
      };

      await updateSession(updatedSession);
      setSession(updatedSession);
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  };

  const sessionId = params.id as string;

  const getShareUrl = () => {
    if (!session) return '';
    const shareData = {
      name: session.name,
      template: session.template, // Include template type
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

    // Check if cupper name is configured
    const savedConfig = localStorage.getItem('feishu_config');
    const config = savedConfig ? JSON.parse(savedConfig) : {};
    
    if (!config.cupperName) {
      setIsNameModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const cupperName = config.cupperName;

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

  const handleSaveName = () => {
    if (!cupperNameInput.trim()) return;
    
    const savedConfig = localStorage.getItem('feishu_config');
    const config = savedConfig ? JSON.parse(savedConfig) : {};
    
    const newConfig = { ...config, cupperName: cupperNameInput.trim() };
    localStorage.setItem('feishu_config', JSON.stringify(newConfig));
    
    setIsNameModalOpen(false);
    alert('昵称设置成功！');
  };

  const executeSync = async () => {
    setIsSyncing(true);
    try {
      const savedConfig = localStorage.getItem('feishu_config');
      const config = savedConfig ? JSON.parse(savedConfig) : {};
      
      // We don't read tableId from localStorage here anymore if we want backend to handle it
      // BUT, current backend implementation relies on `tableId` being passed in body.
      // So we must pass SOMETHING or let backend handle default.
      
      // Since we want "backend hardcoded config", we should NOT pass tableId from here if it's not set.
      // However, to keep backward compatibility with existing `sync` API which expects `tableId`,
      // we can pass a flag or just let backend decide.
      
      // Simplest way: Pass session.type, and let backend decide tableId.
      // But currently sync API reads `body.tableId`.
      
      // We will modify frontend to NOT send tableId (or send null), and backend to use default if null.
      // OR, we send the session object which contains 'type', and backend uses that.

      // Also send config (appId, appSecret, appToken) from localStorage if environment variables are not set on server
      const { appId, appSecret, appToken } = config;

      const response = await fetch('/api/feishu/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          config: { appId, appSecret, appToken }, // Pass config to backend
          // tableId is optional now, backend will handle it based on session.type
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
      alert(session.template === 'voting' ? '投票成功！' : '同步成功！');
    } catch (error: any) {
      console.error("Sync error:", error);
      const errorMessage = error.message.includes('Missing configuration') || error.message.includes('Server configuration error')
        ? '同步失败：服务器未配置飞书密钥，请联系管理员或返回首页设置。'
        : `同步失败: ${error.message}`;
      alert(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyLink = () => {
    if (!session) return;
    const url = getShareUrl();
    const text = `☕️ 邀请您参加杯测会话\n\n📅 主题：${session.name}\n🕒 日期：${formatDate(session.cuppingDate)}\n🧪 样品数：${session.samples.length}支\n${session.blindMode ? '🕶️ 模式：盲测' : '📝 模式：公开'}\n\n👇 点击链接或保存二维码加入：\n${url}`;
    
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
    if (session.template !== 'voting') {
      const missingScores = session?.samples.filter(s => !s.score);
      if (missingScores && missingScores.length > 0) {
        const message = `以下样品尚未评分：\n${missingScores.map(s => s.name).join('\n')}\n\n确定要继续同步吗？未评分的样品将不会包含评分数据。`;
        if (!window.confirm(message)) {
          return; // Stop execution if user cancels
        }
      }
    } else {
        // Voting mode validation: warn if no favorites selected?
        // Actually, maybe they just want to submit notes. It's fine.
        // Or warn if nothing at all is touched?
        // Let's just confirm submission.
        if (!window.confirm('确定要提交您的投票结果吗？提交后无法修改。')) {
            return;
        }
    }

    // Proceed to sync
    await executeSync();
  };

  if (session.template === 'voting') {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 md:p-8 pb-24">
        {/* Simple Header */}
        <div className="max-w-xl mx-auto mb-6 flex items-center justify-between gap-4">
           <div className="flex items-center gap-4">
             <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
               <ArrowLeft className="w-5 h-5 text-gray-600" />
             </Link>
             <div>
               <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
               <p className="text-sm text-gray-500">大众投票模式 · 请选择您喜爱的样品</p>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <Link href={`/session/${sessionId}/report`} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="查看汇总报告">
               <BarChart3 className="w-5 h-5" />
             </Link>
             <button 
               onClick={() => setIsShareOpen(true)}
               className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
               title="分享活动"
             >
               <Share2 className="w-5 h-5" />
             </button>
           </div>
        </div>

        {/* Name Input Modal (Reused) */}
        {isNameModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">👋 欢迎参与投票</h3>
              <p className="text-sm text-gray-500 mb-4">请留下您的昵称</p>
              <input
                type="text"
                value={cupperNameInput}
                onChange={(e) => setCupperNameInput(e.target.value)}
                placeholder="请输入您的姓名或昵称"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-amber-500 outline-none"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsNameModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
                <button onClick={handleSaveName} disabled={!cupperNameInput.trim()} className="px-4 py-2 bg-amber-600 text-white rounded-lg disabled:opacity-50">开始投票</button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-xl mx-auto space-y-4">
          {session.samples.map((sample, index) => {
            const voteScore = sample.score?.voteScore || 0;
            // Backwards compatibility for old records that only have isFavorite
            const isFavorite = !!sample.score?.isFavorite;
            const displayScore = voteScore > 0 ? voteScore : (isFavorite ? 3 : 0); // Default old favorites to 3 stars
            
            const note = sample.score?.notes || '';
            const isNoteExpanded = expandedNotes.includes(sample.id);

            return (
              <div key={sample.id} className={`bg-white rounded-xl border transition-all ${displayScore > 0 ? 'border-amber-500 shadow-md ring-1 ring-amber-500' : 'border-gray-200 shadow-sm'}`}>
                <div className="p-4 flex items-start gap-4">
                  {/* Label */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 mt-1 ${displayScore > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {session.blindMode ? (session.blindLabelType === 'letter' ? String.fromCharCode(65 + index) : index + 1) : index + 1}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 line-clamp-2">
                      {getSampleLabel(sample, index)}
                    </div>
                    {!session.blindMode && (
                      <div className="text-xs text-gray-500 mt-1">{sample.origin} · {sample.process}</div>
                    )}
                  </div>

                  {/* Actions - 3 Hearts */}
                  <div className="flex items-center gap-1 shrink-0">
                    {[1, 2, 3].map((star) => (
                      <button 
                        key={star}
                        onClick={(e) => { e.stopPropagation(); handleVote(sample, star); }}
                        className={`p-1.5 rounded-full transition-all active:scale-90 ${star <= displayScore ? 'text-red-500 hover:bg-red-50' : 'text-gray-300 hover:bg-gray-100'}`}
                      >
                        <Heart className={`w-6 h-6 sm:w-7 sm:h-7 ${star <= displayScore ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note Input - Always visible in voting mode */}
                <div className="px-4 pb-4">
                    <textarea
                      value={note}
                      onChange={(e) => handleVoteNoteChange(sample, e.target.value)}
                      placeholder="写点评价... (选填)"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all resize-none"
                      rows={2}
                      onCompositionStart={(e) => e.stopPropagation()}
                      onCompositionUpdate={(e) => e.stopPropagation()}
                      onCompositionEnd={(e) => e.stopPropagation()}
                    />
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Voting Action Buttons (Bottom Sticky) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 safe-area-bottom">
          <div className="max-w-xl mx-auto flex gap-3">
            <button
              onClick={handleResultsClick}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors font-medium"
            >
              <ListChecks className="w-5 h-5" />
              查看记录
            </button>
            <button 
              onClick={handleSync} 
              disabled={isSyncing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-70 font-bold"
            >
              {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {isSyncing ? '正在提交...' : '提交我的投票'}
            </button>
          </div>
        </div>

        {/* Results Modal */}
      {isResultModalOpen && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-full flex flex-col">
            <div className="p-4 border-b flex justify-between items-center shrink-0 sticky top-0 bg-white z-10 shadow-sm">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-900">{(session as any).template === 'voting' ? '我的投票记录' : '我的杯测结果'}</h2>
                <span className="text-xs text-gray-500">{session.name}</span>
              </div>
              <button onClick={() => setIsResultModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            
            <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-3 pb-24">
              {[...session.samples]
                .map((sample, index) => (
                <div key={sample.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm shrink-0 mt-1">
                      {session.blindMode && session.blindLabelType === 'letter' 
                        ? String.fromCharCode(65 + session.samples.indexOf(sample)) 
                        : `${session.samples.indexOf(sample) + 1}`}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-gray-900 truncate">
                            {getSampleLabel(sample, index)}
                          </div>
                          {!session.blindMode && (
                            <div className="text-xs text-gray-500">{sample.origin} · {sample.process}</div>
                          )}
                        </div>
                        <div className="shrink-0 text-right flex gap-1">
                          {session.template === 'voting' ? (
                            sample.score?.voteScore ? (
                               // Render the number of hearts based on voteScore
                               [...Array(sample.score.voteScore)].map((_, i) => (
                                 <Heart key={i} className="w-5 h-5 text-red-500 fill-current" />
                               ))
                            ) : sample.score?.isFavorite ? (
                               // Fallback for old records
                               <Heart className="w-5 h-5 text-red-500 fill-current" />
                            ) : null
                          ) : (
                            sample.score ? (
                              <div className="text-xl font-bold text-amber-600">{sample.score.totalScore.toFixed(2)}</div>
                            ) : (
                              <span className="text-xs text-gray-400">未评分</span>
                            )
                          )}
                        </div>
                      </div>
                      
                      {(sample.score?.notes) && (
                         <div className="text-sm text-amber-900 bg-amber-50 p-3 rounded-lg border border-amber-100 mt-2">
                           <span className="font-medium text-amber-800/70 text-xs block mb-0.5">评价:</span>
                           {sample.score.notes}
                         </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-6 border-t bg-gray-50 mt-auto safe-area-bottom">
              <p className="text-xs text-center text-gray-500">此页面支持手机系统长截图功能</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Modal for Voting Mode */}
        {isShareOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
              <div className="p-6 border-b flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-gray-900">邀请大众评审加入</h2>
                <button onClick={() => setIsShareOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 flex flex-col items-center overflow-y-auto">
                <div 
                  id="share-card" 
                  className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm w-full space-y-4"
                >
                  <div className="text-center space-y-1">
                    <h3 className="font-bold text-lg text-gray-900">{session.name}</h3>
                    <p className="text-sm text-gray-500">{formatDate(session.cuppingDate)}</p>
                  </div>

                  <div className="border-t border-b border-gray-100 py-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">样品数量</span>
                      <span className="font-medium text-gray-900">{session.samples.length} 支</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">模式</span>
                      <span className="font-medium text-amber-600">
                        大众投票
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center py-2">
                    <div className="p-2 bg-white rounded-lg border border-gray-100">
                      <QRCodeSVG value={getShareUrl()} size={180} />
                    </div>
                  </div>
                  
                  <p className="text-center text-xs text-gray-400">
                    扫码或访问链接参与投票
                  </p>
                </div>

                <div className="w-full">
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                  >
                    <Copy className="w-4 h-4" />
                    复制链接
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Results View - Rendered as a normal page flow to support native long screenshots */}
      {isResultModalOpen && (
        <div className="min-h-screen bg-white flex flex-col">
          <div className="p-4 border-b flex justify-between items-center shrink-0 sticky top-0 bg-white z-10 shadow-sm">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-gray-900">{(session as any).template === 'voting' ? '我的投票记录' : '我的杯测结果'}</h2>
              <span className="text-xs text-gray-500">{session.name}</span>
            </div>
            <button onClick={() => setIsResultModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
          
          <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-3 pb-24" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
            {[...session.samples]
              .map((sample, index) => (
              <div key={sample.id} className="p-4 rounded-xl border flex items-start gap-3" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 mt-1" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
                    {session.blindMode && session.blindLabelType === 'letter' 
                      ? String.fromCharCode(65 + session.samples.indexOf(sample)) 
                      : `${session.samples.indexOf(sample) + 1}`}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold truncate" style={{ color: '#111827' }}>
                          {getSampleLabel(sample, index)}
                        </div>
                        {!session.blindMode && (
                          <div className="text-xs" style={{ color: '#6b7280' }}>{sample.origin} · {sample.process}</div>
                        )}
                      </div>
                      <div className="shrink-0 text-right flex gap-1">
                        {session.template === 'voting' ? (
                          sample.score?.voteScore ? (
                             // Render the number of hearts based on voteScore
                             [...Array(sample.score.voteScore)].map((_, i) => (
                               <Heart key={i} className="w-5 h-5 text-red-500 fill-current" />
                             ))
                          ) : sample.score?.isFavorite ? (
                             // Fallback for old records
                             <Heart className="w-5 h-5 text-red-500 fill-current" />
                          ) : null
                        ) : (
                          sample.score ? (
                            <div className="text-xl font-bold" style={{ color: '#d97706' }}>{sample.score.totalScore.toFixed(2)}</div>
                          ) : (
                            <span className="text-xs" style={{ color: '#9ca3af' }}>未评分</span>
                          )
                        )}
                      </div>
                    </div>
                    
                    {(sample.score?.notes) && (
                       <div className="text-sm p-3 rounded-lg border mt-2" style={{ color: '#78350f', backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}>
                         <span className="font-medium text-xs block mb-0.5" style={{ color: '#92400e' }}>评价:</span>
                         {sample.score.notes}
                       </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="pt-4 text-center text-xs" style={{ color: '#9ca3af' }}>
                生成时间: {new Date().toLocaleString('zh-CN')}
              </div>
          </div>

          <div className="p-6 border-t bg-gray-50 mt-auto safe-area-bottom">
            {/* Removed the hint text to avoid confusion on devices that don't support it */}
          </div>
        </div>
      )}

      {/* Main Content - Hidden when results are open to preserve state but allow results to dictate body height */}
      <div style={{ display: isResultModalOpen ? 'none' : 'block' }}>
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
                  <span>{formatDate(session.cuppingDate)}</span>
                  <span className="mx-1">·</span>
                  <span className={`px-2 py-0.5 rounded text-xs border ${
                    session.type === 'event' 
                      ? 'bg-purple-50 text-purple-700 border-purple-200' 
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {session.type === 'event' ? '公开活动' : '内部杯测'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs border ${
                    session.status === 'synced' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  }`}>
                    {session.status === 'completed' ? '已完成' :
                     session.status === 'synced' ? '已同步' : '草稿'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsResultModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition-colors text-sm font-medium"
              >
                <ListChecks className="w-4 h-4" />
                我的结果
              </button>
              
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {session.status === 'synced' ? '重新同步' : '同步至飞书'}
              </button>
              
              {!session.isGuest && (
                <>
                  <Link
                    href={`/session/${sessionId}/report`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition-colors text-sm font-medium"
                  >
                    <BarChart3 className="w-4 h-4" />
                    汇总报告
                  </Link>
                  
                  <button
                    onClick={() => setIsShareOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition-colors text-sm font-medium"
                  >
                    <Share2 className="w-4 h-4" />
                    邀请打分
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Blind Mode Sample Map (Collapsible) */}
          {session.blindMode && !session.isGuest && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowBlindMap(!showBlindMap)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  {showBlindMap ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
                  {showBlindMap ? '隐藏样品对照表' : '查看样品对照表'}
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
                         <span className="text-gray-500 block">样品名称</span>
                         <span className="font-medium text-gray-900">{activeSample.name}</span>
                       </div>
                       <div>
                         <span className="text-gray-500 block">产地</span>
                         <span className="font-medium text-gray-900">{activeSample.origin}</span>
                       </div>
                       <div>
                         <span className="text-gray-500 block">处理法</span>
                         <span className="font-medium text-gray-900">{activeSample.process}</span>
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

      {/* Name Input Modal */}
      {isNameModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">👋 欢迎加入杯测</h3>
            <p className="text-sm text-gray-500 mb-4">请设置您的称呼，以便记录评分数据。</p>
            <input
              type="text"
              value={cupperNameInput}
              onChange={(e) => setCupperNameInput(e.target.value)}
              placeholder="请输入您的姓名或昵称"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsNameModalOpen(false)}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveName}
                disabled={!cupperNameInput.trim()}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                保存并继续
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {isResultModalOpen && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="min-h-full flex flex-col">
            <div className="p-4 border-b flex justify-between items-center shrink-0 sticky top-0 bg-white z-10 shadow-sm">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-900">{(session as any).template === 'voting' ? '我的投票记录' : '我的杯测结果'}</h2>
                <span className="text-xs text-gray-500">{session.name}</span>
              </div>
              <button onClick={() => setIsResultModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            
            <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-3 pb-24">
              {[...session.samples]
                .map((sample, index) => (
                <div key={sample.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm shrink-0 mt-1">
                      {session.blindMode && session.blindLabelType === 'letter' 
                        ? String.fromCharCode(65 + session.samples.indexOf(sample)) 
                        : `${session.samples.indexOf(sample) + 1}`}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-gray-900 truncate">
                            {getSampleLabel(sample, index)}
                          </div>
                          {!session.blindMode && (
                            <div className="text-xs text-gray-500">{sample.origin} · {sample.process}</div>
                          )}
                        </div>
                        <div className="shrink-0 text-right flex gap-1">
                          {session.template === 'voting' ? (
                            sample.score?.voteScore ? (
                               // Render the number of hearts based on voteScore
                               [...Array(sample.score.voteScore)].map((_, i) => (
                                 <Heart key={i} className="w-5 h-5 text-red-500 fill-current" />
                               ))
                            ) : sample.score?.isFavorite ? (
                               // Fallback for old records
                               <Heart className="w-5 h-5 text-red-500 fill-current" />
                            ) : null
                          ) : (
                            sample.score ? (
                              <div className="text-xl font-bold text-amber-600">{sample.score.totalScore.toFixed(2)}</div>
                            ) : (
                              <span className="text-xs text-gray-400">未评分</span>
                            )
                          )}
                        </div>
                      </div>
                      
                      {(sample.score?.notes) && (
                         <div className="text-sm text-amber-900 bg-amber-50 p-3 rounded-lg border border-amber-100 mt-2">
                           <span className="font-medium text-amber-800/70 text-xs block mb-0.5">评价:</span>
                           {sample.score.notes}
                         </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-6 border-t bg-gray-50 mt-auto safe-area-bottom">
              <p className="text-xs text-center text-gray-500">此页面支持手机系统长截图功能</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-900">邀请杯测师加入</h2>
              <button onClick={() => setIsShareOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 flex flex-col items-center overflow-y-auto">
              {/* Share Card Area */}
              <div 
                id="share-card" 
                className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm w-full space-y-4"
                style={{ backgroundColor: '#ffffff', color: '#000000' }}
              >
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-lg" style={{ color: '#111827' }}>{session.name}</h3>
                  <p className="text-sm" style={{ color: '#6b7280' }}>{formatDate(session.cuppingDate)}</p>
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
              <div className="w-full">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors shadow-sm"
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
      </div>
    </>
  );
}
