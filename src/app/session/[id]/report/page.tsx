"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSessions } from '@/lib/context';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import Link from 'next/link';
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
    const participants = new Set();
    
    // Group records by submitter to calculate exact participant count even if name is missing
    const submitterGroups: Record<string, any[]> = {};
    
    records.forEach(r => {
      // In Feishu, People fields might come back as an array of objects or a string.
      // E.g. [{"name": "Mapple", ...}] or just "Mapple", or even [{"text":"Mapple ","type":"text"}]
      let name = r[participantField];
      if (Array.isArray(name) && name.length > 0) {
        name = name[0].name || name[0].text || name[0];
      }
      if (typeof name === 'object' && name !== null) {
         name = name.name || name.text;
      }
      // Ensure it's a string and trim whitespace
      name = typeof name === 'string' ? name.trim() : '';

      // Try to group by name first, if no name, group by timestamp to assume it's one submission session
      const groupKey = (name && name !== '匿名') ? name : `anon_${r['投票时间'] || r['创建时间'] || Math.random()}`;
      
      if (!submitterGroups[groupKey]) {
        submitterGroups[groupKey] = [];
      }
      submitterGroups[groupKey].push(r);
      
      if (name && name !== '匿名') {
        participants.add(name);
      }
    });
    
    // The true number of participants is the number of distinct groups we found
    let totalParticipants = Object.keys(submitterGroups).length;

    // Group by sample name
    const sampleGroups: Record<string, any[]> = {};
    records.forEach(r => {
      // Handle array format for Sample Name
      let sName = r['样品名称'];
      if (Array.isArray(sName) && sName.length > 0) {
        sName = sName[0].text || sName[0].name || sName[0];
      } else if (typeof sName === 'object' && sName !== null) {
        sName = sName.text || sName.name;
      }
      
      if (!sName) return;
      if (!sampleGroups[sName]) sampleGroups[sName] = [];
      sampleGroups[sName].push(r);
    });

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
        let note = r[noteField];
        if (Array.isArray(note) && note.length > 0) {
          note = note[0].text || note[0].name || note[0];
        } else if (typeof note === 'object' && note !== null) {
          note = note.text || note.name;
        }
        return note;
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
          // In Feishu, the exact key might literally be "# 喜好度" or "喜好度" depending on how API returns it.
          // Let's aggressively search for ANY key containing "喜好度" or "评分".
          let starValue;
          for (const key in r) {
             if (key.includes('喜好度') || key.includes('评分')) {
                 starValue = r[key];
                 break;
             }
          }
          
          if (starValue !== undefined && starValue !== null && starValue !== '') {
            // Check if it's an array from Feishu (e.g. [{"text":"1","type":"text"}])
            if (Array.isArray(starValue) && starValue.length > 0) {
              starValue = starValue[0].text || starValue[0].name || starValue[0];
            } else if (typeof starValue === 'object' && starValue !== null) {
              starValue = starValue.text || starValue.name;
            }
            
            const score = Number(starValue);
            if (!isNaN(score)) {
              return sum + score;
            }
          }
          // Fallback to legacy field if new numeric field is missing or invalid
          let isFav = r['是否喜欢'];
          if (Array.isArray(isFav) && isFav.length > 0) {
             isFav = isFav[0].text;
          }
          return sum + (isFav === '是' ? 3 : 0);
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
          <button className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
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
                  <h3 className="text-xl font-bold text-gray-900">
                    {rankingData.find((x:any) => x.originalName === activeSample.name)?.name || activeSample.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {!session.blindMode && `${activeSample.origin} · ${activeSample.process}`}
                  </p>
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
                        {/* Just a visual representation of high score */}
                        {[1, 2, 3, 4, 5].map((star) => (
                           <svg key={star} className={`w-6 h-6 ${star <= 4 ? 'text-amber-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                             <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                           </svg>
                        ))}
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
    </div>
  );
}
