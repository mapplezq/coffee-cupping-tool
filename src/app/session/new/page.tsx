"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { useSessions } from '@/lib/context';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

const sampleSchema = z.object({
  name: z.string().min(1, "样品名称必填"),
  origin: z.string().min(1, "产地必填"),
  process: z.string().min(1, "处理法必填"),
  roastDate: z.string().min(1, "烘焙日期必填"), // Moved here
});

const sessionSchema = z.object({
  name: z.string().min(1, "杯测名称必填"),
  cuppingDate: z.string().min(1, "杯测日期必填"),
  // roastDate removed from session schema
  samples: z.array(sampleSchema).min(1, "至少需要一个样品"),
});

type SessionFormValues = z.infer<typeof sessionSchema>;

export default function NewSessionPage() {
  const router = useRouter();
  const { addSession } = useSessions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      cuppingDate: new Date().toISOString().split('T')[0],
      samples: [{ name: '', origin: '', process: '', roastDate: new Date().toISOString().split('T')[0] }],
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

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">新建杯测会话</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Basic Info */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">会话详情</h2>
            
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
              <button
                type="button"
                onClick={() => append({ name: '', origin: '', process: '', roastDate: new Date().toISOString().split('T')[0] })}
                className="flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 font-medium"
              >
                <Plus className="w-4 h-4" />
                添加样品
              </button>
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
                      <label className="text-xs font-medium text-gray-500">烘焙日期</label>
                      <input
                        type="date"
                        {...register(`samples.${index}.roastDate`)}
                        className="w-full p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      />
                      {errors.samples?.[index]?.roastDate && <p className="text-red-500 text-xs">{errors.samples[index]?.roastDate?.message}</p>}
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
              {isSubmitting ? '创建中...' : '创建会话'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
