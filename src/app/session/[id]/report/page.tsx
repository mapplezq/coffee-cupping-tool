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

  useEffect(() => {
    const foundSession = sessions.find(s => s.id === id);
    if (foundSession) {
      setSession(foundSession);
      if (foundSession.samples.length > 0) {
        setActiveSampleId(foundSession.samples[0].id);
      }
    }
  }, [id, sessions]);

  if (!session) return <div className="p-8 text-center">加载中...</div>;

  const isEvent = session.type === 'event';
  const samples = session.samples || [];

  // Helper for consistent date formatting
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

    // Support voting template processing
    const isVotingMode = session.template === 'voting';

    // Mock Data for Demo
    const MOCK_AGGREGATE_DATA = {
      totalParticipants: isVotingMode ? 150 : 42,
      averageScores: isVotingMode ? [
        { name: 'A', score: 285, rank: 1 }, // Representing total stars
        { name: 'B', score: 210, rank: 3 },
        { name: 'C', score: 260, rank: 2 },
        { name: 'D', score: 180, rank: 4 },
      ] : [
        { name: 'A', score: 86.5, rank: 1 },
        { name: 'B', score: 84.2, rank: 3 },
        { name: 'C', score: 85.8, rank: 2 },
        { name: 'D', score: 82.0, rank: 4 },
      ],
      // Radar only makes sense for standard scoring, not voting
      radarData: {
        'A': [
          { subject: '干/湿香', A: 8.5, fullMark: 10 },
          { subject: '风味', A: 8.8, fullMark: 10 },
          { subject: '余韵', A: 8.2, fullMark: 10 },
          { subject: '酸质', A: 8.6, fullMark: 10 },
          { subject: '醇厚度', A: 8.4, fullMark: 10 },
          { subject: '平衡度', A: 8.5, fullMark: 10 },
          { subject: '整体', A: 8.7, fullMark: 10 },
        ],
      },
      topFlavors: {
        'A': ['茉莉花', '柑橘', '红茶', '蜂蜜'],
        'B': ['坚果', '巧克力', '焦糖'],
        'C': ['蓝莓', '草莓', '奶油'],
        'D': ['草本', '黑巧克力'],
      } as Record<string, string[]>
    };

  // Prepare data for charts based on REAL samples (mapped to mock data for demo)
  const rankingData = samples.map((s: any, index: number) => ({
    name: session.blindMode ? (session.blindLabelType === 'number' ? `${index + 1}` : String.fromCharCode(65 + index)) : s.name,
    score: MOCK_AGGREGATE_DATA.averageScores[index % 4].score, // Cycle through mock scores
    fill: '#d97706',
  })).sort((a: any, b: any) => b.score - a.score);

  const activeSample = samples.find((s: any) => s.id === activeSampleId);
  const activeSampleIndex = samples.indexOf(activeSample);
  
  // Use mock radar data for the selected sample
  const radarData = MOCK_AGGREGATE_DATA.radarData['A']; // Always use 'A' for demo

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
              <div className="text-2xl font-bold text-amber-600">{MOCK_AGGREGATE_DATA.totalParticipants}</div>
              <div className="text-xs text-gray-500">参与人数</div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[80, 90]} hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
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
            {samples.map((s: any, index: number) => (
              <button
                key={s.id}
                onClick={() => setActiveSampleId(s.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeSampleId === s.id 
                    ? 'bg-amber-600 text-white shadow-md' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {session.blindMode ? (session.blindLabelType === 'number' ? `${index + 1}` : String.fromCharCode(65 + index)) : s.name}
              </button>
            ))}
          </div>

          {activeSample && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {session.blindMode ? (session.blindLabelType === 'number' ? `${activeSampleIndex + 1}` : String.fromCharCode(65 + activeSampleIndex)) : activeSample.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {!session.blindMode && `${activeSample.origin} · ${activeSample.process}`}
                  </p>
                </div>
                <div className="text-right bg-amber-50 px-3 py-1 rounded-lg">
                  <span className="text-xs text-amber-600 font-medium uppercase block">{isVotingMode ? '总喜好度' : '平均分'}</span>
                  <span className="text-xl font-bold text-amber-700">
                    {MOCK_AGGREGATE_DATA.averageScores[activeSampleIndex % 4].score}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {isVotingMode ? (
                  <div className="flex items-center justify-center h-full bg-gray-50 rounded-xl p-8 text-center">
                    <div>
                      <div className="text-4xl font-bold text-amber-500 mb-2">
                        {MOCK_AGGREGATE_DATA.averageScores[activeSampleIndex % 4].score} <span className="text-lg text-gray-500 font-normal">分</span>
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
                    <h4 className="text-sm font-medium text-gray-700 mb-3">风味印象</h4>
                    <div className="flex flex-wrap gap-2">
                      {(MOCK_AGGREGATE_DATA.topFlavors[String.fromCharCode(65 + (activeSampleIndex % 4))] || []).map((flavor: string, i: number) => (
                        <span 
                          key={i} 
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                          style={{ fontSize: i === 0 ? '1.1rem' : '0.9rem', fontWeight: i === 0 ? 'bold' : 'normal' }}
                        >
                          {flavor}
                        </span>
                      ))}
                      {(!MOCK_AGGREGATE_DATA.topFlavors[String.fromCharCode(65 + (activeSampleIndex % 4))]) && <span className="text-gray-400 text-sm">暂无数据</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">最高分</div>
                      <div className="text-lg font-semibold text-gray-900">89.5</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">最低分</div>
                      <div className="text-lg font-semibold text-gray-900">82.0</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
