"use client";

import { useState } from 'react';
import Link from "next/link";
import { useSessions } from "@/lib/context";
import { Plus, Coffee, Calendar, BarChart3, Settings, Trash2 } from "lucide-react";
import SettingsModal from '@/components/SettingsModal';

export default function Home() {
  const { sessions, loading, deleteSession } = useSessions();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent navigation
    if (confirm('确定要删除这个杯测会话吗？此操作无法撤销。')) {
      await deleteSession(id);
    }
  };

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition-colors"
              title="系统配置"
            >
              <Settings className="w-5 h-5" />
            </button>
            <Link 
              href="/samples" 
              className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              title="样品列表"
            >
              <Coffee className="w-5 h-5" />
              <span className="hidden sm:inline">样品库</span>
            </Link>
            <Link 
            href="/session/new" 
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>新建杯测</span>
          </Link>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">总杯测活动</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalSessions}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">本月杯测</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{thisMonthSessions}</div>
          </div>
        </div>

        {/* Session List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近杯测活动</h2>
          {sessions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
              <Coffee className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无杯测活动，请点击新建开始！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <Link 
                  key={session.id} 
                  href={`/session/${session.id}`}
                  className="block bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {session.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          session.status === 'completed' ? 'bg-green-100 text-green-700' :
                          session.status === 'synced' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {session.status === 'completed' ? '已完成' :
                           session.status === 'synced' ? '已同步' : '草稿'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-3">
                        <span>杯测日期: {new Date(session.cuppingDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{session.samples.length} 个样品</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
