"use client";

import { useState, useEffect } from 'react';
import { X, Save, Settings, User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import FeishuGuide from './FeishuGuide';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [config, setConfig] = useState({
    tableId: 'tblMG2e1rOdQnFNJ',
    sampleTableId: 'tblFJKzxagGpVUoP',
    eventTableId: '', // Added eventTableId
    cupperName: '', 
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('feishu_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse saved config");
      }
    } else {
      // Use defaults if no saved config
      setConfig({
        tableId: 'tblMG2e1rOdQnFNJ',
        sampleTableId: 'tblFJKzxagGpVUoP',
        eventTableId: '',
        cupperName: '',
      });
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('feishu_config', JSON.stringify(config));
    onClose();
    alert('配置已保存');
  };

  const handleTestConnection = async () => {
    if (!config.tableId) {
      setTestStatus('error');
      setTestMessage('请先填写Table ID');
      return;
    }

    setTestStatus('testing');
    setTestMessage('');

    try {
      const response = await fetch('/api/feishu/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Connection failed');
      }

      setTestStatus('success');
      setTestMessage('连接成功！配置正确');
    } catch (error: any) {
      setTestStatus('error');
      setTestMessage(error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-700" />
            <h2 className="text-xl font-bold text-gray-900">系统配置</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* User Profile */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4" />
              个人信息
            </h3>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">杯测人姓名</label>
              <input
                type="text"
                value={config.cupperName}
                onChange={(e) => setConfig({ ...config, cupperName: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="请输入您的姓名，用于记录评分"
              />
              <p className="text-xs text-gray-500">此姓名将随评分数据同步至飞书，区分不同评分人。</p>
            </div>
          </div>

          <div className="border-t border-gray-100"></div>

          {/* Feishu Config - Hidden for normal users, hardcoded in backend */}
          {/* 
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 flex justify-between items-center">
              <span>飞书同步配置</span>
            </h3>
            <div className="bg-amber-50 p-4 rounded-lg text-xs text-amber-800 space-y-1">
              <p>系统已预设内部/外部数据表，无需手动配置。</p>
            </div>
          </div> 
          */}
        </div>

        <div className="p-6 bg-gray-50 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
