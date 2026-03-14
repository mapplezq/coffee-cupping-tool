"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sample, CuppingScore, Defect } from '@/lib/types';
import { Save, AlertCircle, BarChart2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useDebouncedCallback } from 'use-debounce';
import InteractiveRadarChart from './InteractiveRadarChart';

const scoreSchema = z.object({
  fragrance: z.number().min(0).max(10),
  flavor: z.number().min(0).max(10),
  aftertaste: z.number().min(0).max(10),
  acidity: z.number().min(0).max(10),
  body: z.number().min(0).max(10),
  balance: z.number().min(0).max(10),
  uniformity: z.number().min(0).max(10),
  cleanCup: z.number().min(0).max(10),
  sweetness: z.number().min(0).max(10),
  overall: z.number().min(0).max(10),
  notes: z.string().optional(),
});

type ScoreFormValues = z.infer<typeof scoreSchema>;

interface ScoringFormProps {
  sample: Sample & { score?: CuppingScore };
  onSave: (scoreData: Omit<CuppingScore, 'id' | 'sampleId' | 'createdAt' | 'cupperName'>) => Promise<void>;
  isSaving: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function ScoringForm({ sample, onSave, isSaving, onDirtyChange }: ScoringFormProps) {
  const [defects, setDefects] = useState<Defect[]>(sample.score?.defects || []);
  const [viewMode, setViewMode] = useState<'slider' | 'radar'>('slider');
  
  const { control, handleSubmit, watch, setValue, reset, formState: { isDirty } } = useForm<ScoreFormValues>({
    resolver: zodResolver(scoreSchema),
    defaultValues: {
      fragrance: sample.score?.fragrance || 8,
      flavor: sample.score?.flavor || 8,
      aftertaste: sample.score?.aftertaste || 8,
      acidity: sample.score?.acidity || 8,
      body: sample.score?.body || 8,
      balance: sample.score?.balance || 8,
      uniformity: sample.score?.uniformity || 10,
      cleanCup: sample.score?.cleanCup || 10,
      sweetness: sample.score?.sweetness || 10,
      overall: sample.score?.overall || 8,
      notes: sample.score?.notes || '',
    },
  });

  // Notify parent about dirty state
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Reset form when sample changes
  useEffect(() => {
    reset({
      fragrance: sample.score?.fragrance || 8,
      flavor: sample.score?.flavor || 8,
      aftertaste: sample.score?.aftertaste || 8,
      acidity: sample.score?.acidity || 8,
      body: sample.score?.body || 8,
      balance: sample.score?.balance || 8,
      uniformity: sample.score?.uniformity || 10,
      cleanCup: sample.score?.cleanCup || 10,
      sweetness: sample.score?.sweetness || 10,
      overall: sample.score?.overall || 8,
      notes: sample.score?.notes || '',
    });
    setDefects(sample.score?.defects || []);
  }, [sample.id, reset, sample.score]);

  const values = watch();

  const calculateTotal = () => {
    const sum = 
      values.fragrance + 
      values.flavor + 
      values.aftertaste + 
      values.acidity + 
      values.body + 
      values.balance + 
      values.uniformity + 
      values.cleanCup + 
      values.sweetness + 
      values.overall;
    
    const defectDeduction = defects.reduce((acc, d) => acc + (d.cups * (d.type === 'taint' ? 2 : 4)), 0);
    return sum - defectDeduction;
  };

  const totalScore = calculateTotal();

  // Auto-save logic
  const debouncedSave = useDebouncedCallback(async (data: ScoreFormValues) => {
    await onSave({
      ...data,
      totalScore,
      defects,
      notes: data.notes || '',
    });
  }, 500);

  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (isDirty) {
      debouncedSave(values);
    }
  }, [values, isDirty, debouncedSave]);

  const onSubmit = async (data: ScoreFormValues) => {
    // Manual save (if needed, or just rely on auto-save)
    debouncedSave.cancel(); // Cancel pending debounce
    await onSave({
      ...data,
      totalScore,
      defects,
      notes: data.notes || '',
    });
  };

  const attributes = [
    { name: 'fragrance', label: '干/湿香' },
    { name: 'flavor', label: '风味' },
    { name: 'aftertaste', label: '余韵' },
    { name: 'acidity', label: '酸质' },
    { name: 'body', label: '醇厚度' },
    { name: 'balance', label: '平衡度' },
    { name: 'overall', label: '整体评价' },
  ];

  const technicalAttributes = [
    { name: 'uniformity', label: '一致性 (10分)' },
    { name: 'cleanCup', label: '干净度 (10分)' },
    { name: 'sweetness', label: '甜度 (10分)' },
  ];

  const handleDefectChange = (cups: number, type: 'taint' | 'fault') => {
    // Simple logic: overwrite defects array with single defect entry for simplicity, or add multiple?
    // Usually one defect type per cup. 
    // Let's implement a simple defect adder: 
    // But for UI simplicity, let's just toggle cups.
    // If cups > 0, we add/update a defect entry.
    
    if (cups === 0) {
      setDefects([]);
      return;
    }
    
    setDefects([{ type, cups, intensity: 0 }]); // intensity is not used in standard calculation but useful for record
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      
      {/* Total Score Header */}
      <div className="bg-amber-900 text-white p-6 rounded-xl shadow-lg sticky top-4 z-10 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">{totalScore.toFixed(2)}</h2>
          <span className="text-amber-200 text-sm font-medium uppercase tracking-wider">总分</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-200">
            {isSaving ? '正在保存...' : isDirty ? '未保存' : '已自动保存'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Sensory Attributes */}
        <div className="space-y-6">
          {/* Notes (Moved to top) */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <label className="text-sm font-medium text-gray-700 mb-2 block">风味描述 / 备注</label>
            <textarea
              {...control.register('notes')}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none text-sm"
              placeholder="先记录干/湿香，啜吸风味..."
            />
          </div>

          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-900">感官指标</h3>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === 'slider' ? "bg-white text-amber-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
                title="滑块模式"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('radar')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === 'radar' ? "bg-white text-amber-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
                title="雷达图模式"
              >
                <Activity className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === 'radar' ? (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex justify-center">
              <InteractiveRadarChart
                data={{
                  fragrance: values.fragrance,
                  flavor: values.flavor,
                  aftertaste: values.aftertaste,
                  acidity: values.acidity,
                  body: values.body,
                  balance: values.balance,
                  overall: values.overall,
                }}
                onChange={(key, val) => {
                  setValue(key as any, val, { shouldDirty: true });
                }}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {attributes.map((attr) => (
                <div key={attr.name} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">{attr.label}</label>
                    <span className="text-sm font-bold text-amber-700">{values[attr.name as keyof ScoreFormValues]}</span>
                  </div>
                  <Controller
                    name={attr.name as any}
                    control={control}
                    render={({ field }) => (
                      <input
                        type="range"
                        min="6"
                        max="10"
                        step="0.25"
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technical Attributes & Defects */}
        <div className="space-y-8">
          
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">基础指标</h3>
            {technicalAttributes.map((attr) => (
              <div key={attr.name} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">{attr.label}</label>
                  <span className="text-sm font-bold text-amber-700">{values[attr.name as keyof ScoreFormValues]}</span>
                </div>
                <div className="flex gap-1">
                   {/* Visual checkboxes for 10 cups/points */}
                   {[...Array(5)].map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setValue(attr.name as any, (i + 1) * 2)}
                        className={cn(
                          "flex-1 h-8 rounded transition-colors text-xs font-bold",
                          (values[attr.name as keyof ScoreFormValues] as number) >= (i + 1) * 2
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-gray-50 text-gray-300 border border-gray-100"
                        )}
                      >
                        {(i + 1) * 2}
                      </button>
                   ))}
                </div>
              </div>
            ))}
          </div>

          {/* Defects */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100">
             <h3 className="text-sm font-medium text-red-800 mb-4 flex items-center gap-2">
               <AlertCircle className="w-4 h-4" />
               缺陷 (扣分)
             </h3>
             <div className="space-y-4">
               <div className="flex items-center gap-4">
                 <label className="text-sm text-gray-600 w-20">杯数</label>
                 <input 
                    type="number" 
                    min="0" 
                    max="5" 
                    className="w-20 p-2 border rounded"
                    value={defects[0]?.cups || 0}
                    onChange={(e) => handleDefectChange(parseInt(e.target.value), defects[0]?.type || 'taint')}
                 />
               </div>
               <div className="flex items-center gap-4">
                 <label className="text-sm text-gray-600 w-20">类型</label>
                 <div className="flex gap-2">
                   <button
                     type="button"
                     onClick={() => handleDefectChange(defects[0]?.cups || 0, 'taint')}
                     className={cn(
                       "px-3 py-1 rounded text-sm border",
                       defects[0]?.type === 'taint' 
                        ? "bg-red-100 border-red-200 text-red-800" 
                        : "bg-white border-gray-200 text-gray-500"
                     )}
                   >
                     瑕疵味 (2分)
                   </button>
                   <button
                     type="button"
                     onClick={() => handleDefectChange(defects[0]?.cups || 0, 'fault')}
                     className={cn(
                       "px-3 py-1 rounded text-sm border",
                       defects[0]?.type === 'fault' 
                        ? "bg-red-100 border-red-200 text-red-800" 
                        : "bg-white border-gray-200 text-gray-500"
                     )}
                   >
                     缺陷味 (4分)
                   </button>
                 </div>
               </div>
             </div>
          </div>

        </div>
      </div>
    </form>
  );
}
