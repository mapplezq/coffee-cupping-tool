"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessions } from '@/lib/context';
import { GlobalSample } from '@/lib/types';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

interface SampleFormProps {
  initialData?: GlobalSample;
  isEdit?: boolean;
}

export default function SampleForm({ initialData, isEdit = false }: SampleFormProps) {
  const router = useRouter();
  const { addGlobalSample, updateGlobalSample } = useSessions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const sampleData: GlobalSample = {
        id: initialData?.id || crypto.randomUUID(),
        name: formData.get('name') as string,
        origin: formData.get('origin') as string,
        process: formData.get('process') as string,
        type: formData.get('type') as any,
        variety: formData.get('variety') as string,
        defectRate: formData.get('defectRate') as string,
        moisture: formData.get('moisture') as string,
        waterActivity: formData.get('waterActivity') as string,
        screenSize: formData.get('screenSize') as string,
        cropYear: formData.get('cropYear') as string,
        supplier: formData.get('supplier') as string,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (isEdit) {
        await updateGlobalSample(sampleData);
      } else {
        await addGlobalSample(sampleData);
      }
      
      router.push('/samples');
    } catch (error) {
      console.error("Failed to save sample:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/samples" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回样品库
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? '编辑样品' : '添加新样品'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-8">
        
        {/* Basic Info Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">基本信息</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              样品名称 <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              defaultValue={initialData?.name}
              required
              type="text"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="例如：埃塞俄比亚 耶加雪菲"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                产地
              </label>
              <input
                name="origin"
                defaultValue={initialData?.origin}
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="例如：Gedeb"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                处理法
              </label>
              <input
                name="process"
                defaultValue={initialData?.process}
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="例如：水洗"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                样品类型 (Type)
              </label>
              <select
                name="type"
                defaultValue={initialData?.type || 'pre_shipment'}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="pre_shipment">货前样</option>
                <option value="processing">加工样</option>
                <option value="arrival">到货样</option>
                <option value="sales">可销售样</option>
                <option value="self_drawn">自抽样</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                豆种 (Variety)
              </label>
              <input
                name="variety"
                defaultValue={initialData?.variety}
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="例如：Geisha, Bourbon"
              />
            </div>
          </div>
        </div>

        {/* Technical Details Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">详细参数 (可选)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                瑕疵率 (Defect Rate)
              </label>
              <input
                name="defectRate"
                defaultValue={initialData?.defectRate}
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="例如：2%"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                水分 (Moisture)
              </label>
              <input
                name="moisture"
                defaultValue={initialData?.moisture}
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="例如：10.5%"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                水活性 (Water Activity)
              </label>
              <input
                name="waterActivity"
                defaultValue={initialData?.waterActivity}
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="例如：0.65aw"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目数 (Screen Size)
              </label>
              <input
                name="screenSize"
                defaultValue={initialData?.screenSize}
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="例如：15-17"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                产季 (Crop Year)
              </label>
              <input
                name="cropYear"
                defaultValue={initialData?.cropYear}
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="例如：2023/2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                提供商 (Supplier)
              </label>
              <input
                name="supplier"
                defaultValue={initialData?.supplier}
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="例如：某某庄园"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <Link
            href="/samples"
            className="px-4 py-2 mr-4 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-8 py-2 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? '保存中...' : '保存样品'}
          </button>
        </div>
      </form>
    </div>
  );
}
