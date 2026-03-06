"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { useSessions } from '@/lib/context';
import { Plus, Trash2, ArrowLeft, Save, BookOpen, X, Search } from 'lucide-react';
import Link from 'next/link';
import { GlobalSample } from '@/lib/types';

const sampleSchema = z.object({
  name: z.string().min(1, "样品名称必填"),
  origin: z.string().min(1, "产地必填"),
  process: z.string().min(1, "处理法必填"),
  type: z.enum(['pre_shipment', 'processing', 'arrival', 'sales', 'self_drawn', 'other']).default('pre_shipment'),
});

const sessionSchema = z.object({
  name: z.string().min(1, "杯测名称必填"),
  cuppingDate: z.string().min(1, "杯测日期必填"),
  samples: z.array(sampleSchema).min(1, "至少需要一个样品"),
});

type SessionFormValues = z.infer<typeof sessionSchema>;

export default function NewSessionPage() {
  const router = useRouter();
  const { addSession, globalSamples } = useSessions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLibrarySamples, setSelectedLibrarySamples] = useState<string[]>([]);

  const { register, control, handleSubmit, formState: { errors } } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      cuppingDate: new Date().toISOString().split('T')[0],
      samples: [{ name: '', origin: '', process: '', type: 'pre_shipment' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "samples",
  });

  const onSubmit = async (data: SessionFormValues) => {
    setIsSubmitting(true);
    try {
      const sessionId = uuidv4();
      const newSession = {
        id: sessionId,
        name: data.name,
        cuppingDate: data.cuppingDate,
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        samples: data.samples.map(s => ({
          id: uuidv4(),
          sessionId: sessionId,
          ...s,
          createdAt: new Date().toISOString(),
        })),
      };

      await addSession(newSession);
      router.push(`/session/${sessionId}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFromLibrary = () => {
    const selected = globalSamples.filter(s => selectedLibrarySamples.includes(s.id));
    selected.forEach(s => {
      append({
        name: s.name,
        origin: s.origin,
        process: s.process,
        type: s.type || 'pre_shipment',
      });
    });
    setIsSampleModalOpen(false);
    setSelectedLibrarySamples([]);
    setSearchTerm("");
  };

  const toggleSampleSelection = (id: string) => {
    setSelectedLibrarySamples(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const filteredGlobalSamples = globalSamples.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.origin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">新建杯测活动</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Basic Info */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">活动详情</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">杯测名称</label>
                <input
                  {...register("name")}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  placeholder="例如：2024春季新品测试"
                />
                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">杯测日期</label>
                <input
                  type="date"
                  {...register("cuppingDate")}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                />
                {errors.cuppingDate && <p className="text-red-500 text-xs">{errors.cuppingDate.message}</p>}
              </div>
            </div>
          </div>

          {/* Samples */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-lg font-semibold text-gray-900">样品列表</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSampleModalOpen(true)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  从样品库选择
                </button>
                <button
                  type="button"
                  onClick={() => append({ name: '', origin: '', process: '', type: 'pre_shipment' })}
                  className="flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 font-medium px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  手动添加
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-start bg-gray-50 p-4 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">样品名称</label>
                      <input
                        {...register(`samples.${index}.name`)}
                        className="w-full p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                        placeholder="例如：埃塞俄比亚耶加雪菲"
                      />
                      {errors.samples?.[index]?.name && <p className="text-red-500 text-xs">{errors.samples[index]?.name?.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">产地</label>
                      <input
                        {...register(`samples.${index}.origin`)}
                        className="w-full p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                        placeholder="例如：埃塞俄比亚"
                      />
                      {errors.samples?.[index]?.origin && <p className="text-red-500 text-xs">{errors.samples[index]?.origin?.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">处理法</label>
                      <input
                        {...register(`samples.${index}.process`)}
                        className="w-full p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                        placeholder="例如：水洗"
                      />
                      {errors.samples?.[index]?.process && <p className="text-red-500 text-xs">{errors.samples[index]?.process?.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">样品类型</label>
                      <select
                        {...register(`samples.${index}.type`)}
                        className="w-full p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      >
                        <option value="pre_shipment">货前样</option>
                        <option value="processing">加工样</option>
                        <option value="arrival">到货样</option>
                        <option value="sales">可销售样</option>
                        <option value="self_drawn">自抽样</option>
                        <option value="other">其他</option>
                      </select>
                    </div>
                  </div>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="mt-6 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {errors.samples && <p className="text-red-500 text-xs">{errors.samples.message}</p>}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-8 py-3 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? '创建中...' : '创建活动'}
            </button>
          </div>
        </form>
      </div>

      {/* Sample Selection Modal */}
      {isSampleModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">选择样品</h3>
              <button 
                onClick={() => setIsSampleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索样品..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredGlobalSamples.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  没有找到样品，请先去样品库添加，或直接手动添加。
                </div>
              ) : (
                filteredGlobalSamples.map(sample => (
                  <div 
                    key={sample.id}
                    onClick={() => toggleSampleSelection(sample.id)}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedLibrarySamples.includes(sample.id)
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center ${
                      selectedLibrarySamples.includes(sample.id)
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedLibrarySamples.includes(sample.id) && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{sample.name}</div>
                      <div className="text-xs text-gray-500">
                        {sample.origin} · {sample.process} · {
                          sample.type === 'pre_shipment' ? '货前样' :
                          sample.type === 'processing' ? '加工样' :
                          sample.type === 'arrival' ? '到货样' :
                          sample.type === 'sales' ? '可销售样' :
                          sample.type === 'self_drawn' ? '自抽样' :
                          sample.type === 'other' ? '其他' : sample.type
                        }
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setIsSampleModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddFromLibrary}
                disabled={selectedLibrarySamples.length === 0}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                添加选中的 {selectedLibrarySamples.length} 个样品
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
