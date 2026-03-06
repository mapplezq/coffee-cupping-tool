"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSessions } from '@/lib/context';
import { GlobalSample } from '@/lib/types';
import SampleForm from '@/components/SampleForm';

export default function EditSamplePage() {
  const params = useParams();
  const router = useRouter();
  const { globalSamples, loading } = useSessions();
  const [sample, setSample] = useState<GlobalSample | null>(null);

  useEffect(() => {
    if (!loading && params.id) {
      const found = globalSamples.find(s => s.id === params.id);
      if (found) {
        setSample(found);
      } else {
        router.push('/samples');
      }
    }
  }, [globalSamples, loading, params.id, router]);

  if (loading || !sample) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <SampleForm initialData={sample} isEdit={true} />
    </div>
  );
}
