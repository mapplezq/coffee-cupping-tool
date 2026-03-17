"use client";

import { useState } from 'react';
import Link from "next/link";
import { useSessions } from "@/lib/context";
import { Plus, Coffee, Calendar, BarChart3, Settings, Trash2, Search, Filter } from "lucide-react";
import SettingsModal from '@/components/SettingsModal';

export default function Home() {
  const { sessions, loading, deleteSession } = useSessions();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent navigation
    if (confirm('确定要删除这个杯测会话吗？此操作无法撤销。')) {
      await deleteSession(id);
    }
  };

  const filteredSessions = sessions.filter(session => 
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const totalSessions = sessions.length;
  const thisMonthSessions = sessions.filter(s => {
    const date = new Date(s.cuppingDate);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">咖啡杯测工具</h1>
            <p className="text-gray-500 text-sm">高效管理您的每一次咖啡杯测</p>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-full shadow-sm transition-colors"
            title="系统配置"
          >
            <Settings className="w-5 h-5" />
          </button>
        </header>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link 
            href="/session/new" 
            className="group flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all text-white"
          >
            <div className="bg-white/20 p-3 rounded-full mb-3 group-hover:bg-white/30 transition-colors">
              <Plus className="w-8 h-8" />
            </div>
            <span className="font-bold text-lg">新建杯测</span>
            <span className="text-amber-100 text-xs mt-1">开始一场新的感官评估</span>
          </Link>

          <Link 
            href="/samples" 
            className="group flex flex-col items-center justify-center p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-200 hover:scale-[1.02] transition-all"
          >
            <div className="bg-amber-50 p-3 rounded-full mb-3 text-amber-600 group-hover:bg-amber-100 transition-colors">
              <Coffee className="w-8 h-8" />
            </div>
            <span className="font-bold text-lg text-gray-900">样品库入库</span>
            <span className="text-gray-500 text-xs mt-1">管理生豆与烘焙样品</span>
          </Link>
        </div>

        {/* Session List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最近杯测活动</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded-full">{filteredSessions.length} 场</span>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 sm:text-sm transition duration-150 ease-in-out"
              placeholder="搜索杯测活动..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
              <Coffee className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchQuery ? '没有找到匹配的活动' : '暂无杯测活动，请点击新建开始！'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <Link 
                  key={session.id} 
                  href={`/session/${session.id}`}
                  className="block bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900 truncate pr-2">
                          {session.name}
                        </h3>
                        
                        {/* Status Badge */}
                        <span className={`text-xs px-2 py-0.5 rounded-md border ${
                          session.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                          session.status === 'synced' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                          {session.status === 'completed' ? '已完成' :
                           session.status === 'synced' ? '已同步' : '草稿'}
                        </span>

                        {/* Type Badge */}
                        <span className={`text-xs px-2 py-0.5 rounded-md border ${
                          session.type === 'event' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {session.type === 'event' ? '公开活动' : '内部杯测'}
                        </span>

                        {/* Template Badge */}
                        <span className={`text-xs px-2 py-0.5 rounded-md border ${
                          session.template === 'voting'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {session.template === 'voting' ? '大众投票' : '专业打分'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(session.cuppingDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Coffee className="w-3.5 h-3.5" />
                          <span>{session.samples.length} 支样品</span>
                        </div>
                        {session.blindMode && (
                           <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                             盲测
                           </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="p-2 ml-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="删除会话"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
