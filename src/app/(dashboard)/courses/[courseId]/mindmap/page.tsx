'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MindMap } from '@/components/course/MindMap';
import { GitFork } from 'lucide-react';

export default function MindMapPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [courseName, setCourseName] = useState('과목');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('courses')
        .select('name')
        .eq('id', courseId)
        .single();
      if (data?.name) setCourseName(data.name);
    };
    load();
  }, [courseId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <GitFork className="h-5 w-5 text-indigo-500" />
            <h2 className="text-2xl font-bold">마인드맵</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            학습 기록을 시각적으로 탐색해보세요
          </p>
        </div>
      </div>

      <MindMap courseId={courseId} courseName={courseName} />
    </div>
  );
}
