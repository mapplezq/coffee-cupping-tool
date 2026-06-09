"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSessions } from '@/lib/context';
import { ArrowLeft, Download, Share2, Star, Copy, X } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import LZString from 'lz-string';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

// Mock Data for Event Mode - Removed from global scope to use inside component based on template

export default function ReportPage({ params }: ReportPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { sessions } = useSessions();
  const [session, setSession] = useState<any>(null);
  const [activeSampleId, setActiveSampleId] = useState<string>('');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string>('');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareReportUrl, setShareReportUrl] = useState('');

  useEffect(() => {
    const foundSession = sessions.find(s => s.id === id);
    if (foundSession) {
      setSession(foundSession);
      if (foundSession.samples.length > 0) {
        setActiveSampleId(foundSession.samples[0].id);
      }
      fetchReport(foundSession);
    }
  }, [id, sessions]);

  const fetchReport = async (currentSession: any) => {
    setIsLoadingReport(true);
    setReportError('');
    try {
      const savedConfig = localStorage.getItem('feishu_config');
      const config = savedConfig ? JSON.parse(savedConfig) : {};

      const res = await fetch('/api/feishu/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionName: currentSession.name,
          template: currentSession.template,
          type: currentSession.type,
          config: {
            appId: config.appId,
            appSecret: config.appSecret,
            appToken: config.appToken,
          }
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch report');
      }

      processReportData(json.data, currentSession);
    } catch (err: any) {
      console.error(err);
      setReportError(err.message);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const processReportData = (records: any[], currentSession: any) => {
    const isVoting = currentSession.template === 'voting';
    
    // Total participants (Deduplicate by Participant Name)
    const participantField = isVoting ? '投票人' : '杯测人';
    const toText = (value: any) => {
      if (Array.isArray(value) && value.length > 0) {
        const v0 = value[0];
        if (typeof v0 === 'string') return v0.trim();
        if (typeof v0 === 'object' && v0 !== null) return String(v0.text || v0.name || '').trim();
        return String(v0).trim();
      }
      if (typeof value === 'object' && value !== null) return String(value.text || value.name || '').trim();
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number') return String(value);
      return '';
    };

    const toNumber = (value: any) => {
      if (Array.isArray(value) && value.length > 0) {
        const v0 = value[0];
        if (typeof v0 === 'number') return v0;
        if (typeof v0 === 'string') {
          const n = Number(v0);
          return Number.isNaN(n) ? null : n;
        }
        if (typeof v0 === 'object' && v0 !== null) {
          const n = Number(v0.text ?? v0.name);
          return Number.isNaN(n) ? null : n;
        }
        const n = Number(v0);
        return Number.isNaN(n) ? null : n;
      }
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const n = Number(value);
        return Number.isNaN(n) ? null : n;
      }
      if (typeof value === 'object' && value !== null) {
        const n = Number(value.text ?? value.name);
        return Number.isNaN(n) ? null : n;
      }
      return null;
    };

    const getTime = (r: any) => {
      const t = r['投票时间'] ?? r['创建时间'];
      const n = toNumber(t);
      return typeof n === 'number' ? n : 0;
    };

    const getVoteScore = (r: any) => {
      for (const key in r) {
        if (key.includes('喜好度') || key.includes('评分')) {
          const n = toNumber(r[key]);
          if (typeof n === 'number') return n;
          break;
        }
      }
      const isFav = toText(r['是否喜欢']);
      return isFav === '是' ? 5 : 0;
    };

    const normalizedRecords = isVoting
      ? (() => {
          const latestByVoterSample = new Map<string, { sampleName: string; voterKey: string; time: number; stars: number; note: string }>();
          for (const r of records) {
            const sampleName = toText(r['样品名称']);
            if (!sampleName) continue;
            const name = toText(r[participantField]);
            const time = getTime(r);
            const voterKey = name && name !== '匿名' ? name : `anon_${time}`;
            const stars = getVoteScore(r);
            const note = toText(r['评语']);
            const key = `${voterKey}|${sampleName}`;
            const existing = latestByVoterSample.get(key);
            if (!existing || time >= existing.time) {
              latestByVoterSample.set(key, { sampleName, voterKey, time, stars, note });
            }
          }
          return Array.from(latestByVoterSample.values());
        })()
      : records;

    const totalParticipants = isVoting
      ? new Set((normalizedRecords as any[]).map(r => r.voterKey)).size
      : (() => {
          const participants = new Set(records.map(r => toText(r[participantField])).filter(Boolean));
          return participants.size;
        })();

    // Group by sample name
    const sampleGroups: Record<string, any[]> = {};
    if (isVoting) {
      (normalizedRecords as any[]).forEach(r => {
        const sName = r.sampleName;
        if (!sName) return;
        if (!sampleGroups[sName]) sampleGroups[sName] = [];
        sampleGroups[sName].push(r);
      });
    } else {
      records.forEach(r => {
        const sName = toText(r['样品名称']);
        if (!sName) return;
        if (!sampleGroups[sName]) sampleGroups[sName] = [];
        sampleGroups[sName].push(r);
      });
    }

    const averageScores: any[] = [];
    const radarData: Record<string, any[]> = {};
    const topFlavors: Record<string, string[]> = {};
    const stats: Record<string, { high: number, low: number }> = {};

    currentSession.samples.forEach((sample: any) => {
      const sRecords = sampleGroups[sample.name] || [];
      const sName = sample.name;

      // Extract flavors/notes
      const noteField = isVoting ? '评语' : '风味笔记';
      const notes = sRecords.map(r => {
        if (isVoting) return r.note;
        return toText(r[noteField]);
      }).filter(Boolean);
      // Simple word extraction for flavors (split by common punctuation)
      const words = notes.flatMap(n => n.split(/[,，、。\s]+/)).filter(w => w.length > 1 && w !== '【展会活动】');
      const wordCounts: Record<string, number> = {};
      words.forEach(w => wordCounts[w] = (wordCounts[w] || 0) + 1);
      topFlavors[sName] = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(e => e[0]);

      if (isVoting) {
        // Sum of "喜好度" or count of "是否喜欢"
        const totalStars = sRecords.reduce((sum, r) => {
          return sum + (typeof r.stars === 'number' ? r.stars : 0);
        }, 0);
        
        averageScores.push({
          name: sName,
          score: totalStars
        });
      } else {
        // Standard mode calculations
        const validScores = sRecords.map(r => Number(r['总分'])).filter(s => !isNaN(s) && s > 0);
        const avgScore = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
        
        averageScores.push({
          name: sName,
          score: Number(avgScore.toFixed(2))
        });

        if (validScores.length > 0) {
          stats[sName] = {
            high: Math.max(...validScores),
            low: Math.min(...validScores)
          };
        } else {
          stats[sName] = { high: 0, low: 0 };
        }

        // Radar data
        const subjects = ['香气', '风味', '余韵', '酸度', '醇厚度', '平衡度', '干净度'];
        const avgRadar = subjects.map(sub => {
          const vals = sRecords.map(r => Number(r[sub])).filter(v => !isNaN(v) && v > 0);
          const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          return {
            subject: sub,
            A: Number(avg.toFixed(2)),
            fullMark: 10
          };
        });
        radarData[sName] = avgRadar;
      }
    });

    // Sort and rank
    averageScores.sort((a, b) => b.score - a.score);
    averageScores.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    setReportData({
      totalParticipants,
      averageScores,
      radarData,
      topFlavors,
      stats
    });
  };

  if (!session) return <div className="p-8 text-center">加载中...</div>;

  if (isLoadingReport) return <div className="p-8 text-center">生成报告中，正在从飞书获取最新数据...</div>;
  if (reportError) return <div className="p-8 text-center text-red-500">获取数据失败: {reportError}</div>;
  if (!reportData) return <div className="p-8 text-center">暂无数据</div>;

  const isEvent = session.type === 'event';
  const samples = session.samples || [];

  // Helper for consistent date formatting
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

    // Support voting template processing
    const isVotingMode = session.template === 'voting';

    // Prepare data for charts based on REAL samples
    const rankingData = samples.map((s: any, index: number) => {
      const sName = s.name;
      // In reportData, we used sName to group. We must find the score by sName.
      const scoreItem = reportData.averageScores.find((x: any) => x.name === sName);
      
      // Default label to Name if not blind, otherwise use Index or Letter
      let label = sName;
      if (session.blindMode) {
          label = session.blindLabelType === 'number' ? `${index + 1}` : String.fromCharCode(65 + index);
      }
  
      return {
        name: label,
        score: scoreItem ? scoreItem.score : 0,
        fill: '#d97706',
        originalName: sName
      };
    }).sort((a: any, b: any) => b.score - a.score);

  const activeSample = samples.find((s: any) => s.id === activeSampleId);
  const activeSampleIndex = samples.indexOf(activeSample);
  
  const radarData = activeSample ? reportData.radarData[activeSample.name] : [];
  const activeScoreItem = activeSample ? reportData.averageScores.find((x: any) => x.name === activeSample.name) : null;
  const activeScore = activeScoreItem ? activeScoreItem.score : 0;

  useEffect(() => {
    if (!session) return;
    if (typeof window === 'undefined') return;

    const shareData = {
      v: 2,
      n: session.name,
      t: session.template,
      d: session.cuppingDate,
      b: session.blindMode,
      l: session.blindLabelType,
      s: (session.samples || []).map((s: any) => [s.name, s.origin, s.process, s.type] as const),
    };

    const baseUrl = window.location.origin;
    const jsonString = JSON.stringify(shareData);
    const lz = LZString.compressToEncodedURIComponent(jsonString);
    const applyUrl = (dataParam: string) => setShareReportUrl(`${baseUrl}/session/join?data=${dataParam}&to=report`);
    applyUrl(lz);

    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch('/api/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ op: 'encode', jsonString }),
        });
        const result = await response.json();
        if (!response.ok) return;
        const gz = result?.data;
        if (typeof gz !== 'string' || !gz.startsWith('gz:')) return;
        if (cancelled) return;
        if (gz.length < lz.length) applyUrl(gz);
      } catch (_) {
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isWeChat = /MicroMessenger/i.test(userAgent);

  const shareText = `☕️ 杯测报告\n\n📌 主题：${session.name}\n📅 日期：${formatDate(session.cuppingDate)}\n👥 参与人数：${reportData.totalParticipants}\n\n👇 打开链接查看：\n${shareReportUrl}`;

  const getQrSize = (value: string) => {
    const len = value.length;
    if (len > 2000) return 320;
    if (len > 1200) return 300;
    if (len > 800) return 280;
    if (len > 450) return 260;
    return 240;
  };
  const qrSize = getQrSize(shareReportUrl);

  const handleShare = () => {
    setShareCopied(false);
    setIsShareOpen(true);
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || !(navigator as any).share) return;
    try {
      await (navigator as any).share({
        title: `杯测报告：${session.name}`,
        text: shareText,
        url: shareReportUrl,
      });
    } catch (_) {
      setIsShareOpen(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (_) {
      window.prompt('复制下面内容分享给他人：', shareText);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/session/${id}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">杯测报告 {isEvent && <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full ml-2">展会活动</span>}</h1>
              <p className="text-xs text-gray-500">{session.name} · {formatDate(session.cuppingDate)}</p>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            导出长图
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-8">
        
        {/* Overview Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">活动总览</h2>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-600">{reportData.totalParticipants}</div>
              <div className="text-xs text-gray-500">参与人数</div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={isVotingMode ? [0, 'dataMax'] : [80, 'dataMax']} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={80} 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(value, index) => {
                    if (session.blindMode) return value;
                    return value.length > 5 ? value.substring(0, 5) + '...' : value;
                  }}
                />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="score" fill="#d97706" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#666', fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 px-2">单品详析</h2>
          
          {/* Sample Selector Tabs */}
          <div className="flex overflow-x-auto gap-2 pb-2 px-2 no-scrollbar">
            {rankingData.map((item: any, index: number) => {
              const s = samples.find((x:any) => x.name === item.originalName);
              if (!s) return null;
              return (
              <button
                key={s.id}
                onClick={() => setActiveSampleId(s.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeSampleId === s.id 
                    ? 'bg-amber-600 text-white shadow-md' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </button>
            )})}
          </div>

          {activeSample && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {rankingData.find((x:any) => x.originalName === activeSample.name)?.name || activeSample.name}
                    </h3>
                    {session.blindMode && (
                      <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                        盲测模式
                      </span>
                    )}
                  </div>
                  {session.blindMode ? (
                     !session.isGuest ? (
                       <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100/50">
                         <span className="text-gray-500 text-xs block mb-1">真实样品信息</span>
                         <span className="font-medium text-gray-800 text-sm">{activeSample.name}</span>
                         <span className="text-xs text-gray-500 ml-2">{activeSample.origin} · {activeSample.process}</span>
                       </div>
                     ) : null
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">
                      {`${activeSample.origin} · ${activeSample.process}`}
                    </p>
                  )}
                </div>
                <div className="text-right bg-amber-50 px-3 py-1 rounded-lg">
                  <span className="text-xs text-amber-600 font-medium uppercase block">{isVotingMode ? '总喜好度' : '平均分'}</span>
                  <span className="text-xl font-bold text-amber-700">
                    {activeScore}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {isVotingMode ? (
                  <div className="flex items-center justify-center h-full bg-gray-50 rounded-xl p-8 text-center">
                    <div>
                      <div className="text-4xl font-bold text-amber-500 mb-2">
                        {activeScore} <span className="text-lg text-gray-500 font-normal">{isVotingMode ? '星' : '分'}</span>
                      </div>
                      <p className="text-gray-500 text-sm">综合了所有参与者的投票得分</p>
                      <div className="mt-4 flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const avgScore = reportData.totalParticipants > 0 ? activeScore / reportData.totalParticipants : 0;
                          const filled = star <= Math.round(avgScore);
                          return (
                            <Star
                              key={star}
                              className={`w-7 h-7 ${filled ? 'text-red-500 fill-current' : 'text-gray-200'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Radar Chart */
                  <div className="h-64 w-full flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[6, 10]} tick={false} axisLine={false} />
                        <Radar
                          name="平均表现"
                          dataKey="A"
                          stroke="#d97706"
                          strokeWidth={2}
                          fill="#d97706"
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Flavor Cloud & Stats */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">{isVotingMode ? '热门评价' : '风味印象'}</h4>
                    <div className="flex flex-wrap gap-2">
                      {reportData.topFlavors[activeSample.name] && reportData.topFlavors[activeSample.name].length > 0 ? (
                        reportData.topFlavors[activeSample.name].map((flavor: string, i: number) => (
                          <span 
                            key={i} 
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                            style={{ fontSize: i === 0 ? '1.1rem' : '0.9rem', fontWeight: i === 0 ? 'bold' : 'normal' }}
                          >
                            {flavor}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">暂无数据</span>
                      )}
                    </div>
                  </div>

                  {!isVotingMode && reportData.stats[activeSample.name] && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">最高分</div>
                        <div className="text-lg font-semibold text-gray-900">{reportData.stats[activeSample.name].high}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-500">最低分</div>
                        <div className="text-lg font-semibold text-gray-900">{reportData.stats[activeSample.name].low}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {isShareOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">分享杯测报告</h2>
              </div>
              <button onClick={() => setIsShareOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex flex-col items-center overflow-y-auto">
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm w-full space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-lg text-gray-900">{session.name}</h3>
                  <p className="text-sm text-gray-500">{formatDate(session.cuppingDate)}</p>
                </div>

                <div className="border-t border-b border-gray-100 py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">参与人数</span>
                    <span className="font-medium text-gray-900">{reportData.totalParticipants}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">样品数量</span>
                    <span className="font-medium text-gray-900">{session.samples.length} 支</span>
                  </div>
                </div>

                <div className="flex justify-center py-2">
                  <div className="p-2 bg-white rounded-lg border border-gray-100">
                    <QRCodeSVG
                      value={shareReportUrl}
                      size={qrSize}
                      includeMargin
                      level="L"
                      bgColor="#ffffff"
                      fgColor="#000000"
                      style={{ shapeRendering: 'crispEdges' } as any}
                    />
                  </div>
                </div>

                <p className="text-center text-xs text-gray-400">扫码或复制文案分享报告</p>
              </div>

              <div className="w-full space-y-3">
                {isWeChat && (
                  <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-3 leading-5">
                    微信里用“转给朋友”经常会直接关闭且不发送，建议使用“复制文案”，粘贴到微信聊天即可。
                  </div>
                )}
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  <Copy className="w-4 h-4" />
                  {shareCopied ? '已复制' : '复制文案'}
                </button>
                {!isWeChat && typeof navigator !== 'undefined' && (navigator as any).share && (
                  <button
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors shadow-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    系统分享
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  保存为 PDF
                </button>
                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-3 leading-5">
                  iPhone Safari 可在分享菜单选择“整页截屏”生成长图；安卓可使用系统“滚动截屏”。
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
