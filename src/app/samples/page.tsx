"use client";

import { useSessions } from "@/lib/context";
import { Plus, Trash2, ArrowLeft, Coffee, UploadCloud, Edit } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SampleList() {
  const { globalSamples, deleteGlobalSample, loading } = useSessions();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const filteredSamples = globalSamples.filter(sample => 
    sample.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sample.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sample.supplier && sample.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个样品吗？')) {
      await deleteGlobalSample(id);
    }
  };

  const handleSync = async () => {
    const savedConfig = localStorage.getItem('feishu_config');
    let config = {};
    if (savedConfig) {
      config = JSON.parse(savedConfig);
    }
    
    // Allow syncing even without local config (backend will use defaults)
    
    if (!confirm(`确定要将 ${globalSamples.length} 个样品同步到飞书吗？`)) return;

    setIsSyncing(true);
    try {
      const res = await fetch('/api/feishu/sync-samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          samples: globalSamples,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert('同步成功！');
    } catch (error: any) {
      alert('同步失败: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">样品库</h1>
              <p className="text-gray-500 text-sm">管理所有咖啡样品</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleSync}
              disabled={isSyncing || globalSamples.length === 0}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isSyncing ? '同步中...' : '同步到飞书'}</span>
            </button>
            <Link 
              href="/samples/new" 
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>新建样品</span>
            </Link>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input 
              type="text" 
              placeholder="搜索样品名称或产地..." 
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {filteredSamples.length === 0 ? (
            <div className="text-center py-12">
              <Coffee className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无样品，请添加新样品</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-900 font-medium">
                  <tr>
                    <th className="px-6 py-3">名称</th>
                    <th className="px-6 py-3">产地</th>
                    <th className="px-6 py-3">处理法</th>
                    <th className="px-6 py-3">豆种/提供商</th>
                    <th className="px-6 py-3">样品类型</th>
                    <th className="px-6 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSamples.map((sample) => (
                    <tr key={sample.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div>{sample.name}</div>
                        {(sample.defectRate || sample.moisture) && (
                          <div className="text-xs text-gray-400 mt-1">
                            {sample.defectRate ? `瑕疵:${sample.defectRate} ` : ''}
                            {sample.moisture ? `水:${sample.moisture}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">{sample.origin}</td>
                      <td className="px-6 py-4">{sample.process}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {sample.variety && <div>{sample.variety}</div>}
                        {sample.supplier && <div className="text-xs text-gray-400">{sample.supplier}</div>}
                      </td>
                      <td className="px-6 py-4">
                        {
                          sample.type === 'pre_shipment' ? '货前样' :
                          sample.type === 'processing' ? '加工样' :
                          sample.type === 'arrival' ? '到货样' :
                          sample.type === 'sales' ? '可销售样' :
                          sample.type === 'self_drawn' ? '自抽样' :
                          sample.type === 'other' ? '其他' : 
                          sample.type || '-'
                        }
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link 
                            href={`/samples/${sample.id}`}
                            className="text-gray-400 hover:text-amber-600 transition-colors"
                            title="编辑样品"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDelete(sample.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="删除样品"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
