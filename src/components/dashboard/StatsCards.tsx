'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, MessageSquare, FileText, Brain } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Stats {
  courses: number;
  conversations: number;
  messages: number;
  documents: number;
  memories: number;
}

const STAT_ITEMS = [
  { key: 'courses' as const, icon: BookOpen, label: '과목', color: 'text-indigo-600 bg-indigo-50' },
  { key: 'conversations' as const, icon: MessageSquare, label: '대화', color: 'text-blue-600 bg-blue-50' },
  { key: 'documents' as const, icon: FileText, label: '자료', color: 'text-emerald-600 bg-emerald-50' },
  { key: 'memories' as const, icon: Brain, label: '학습 기록', color: 'text-violet-600 bg-violet-50' },
];

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4 px-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-7 w-10" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key}>
            <CardContent className="flex items-center gap-3 py-4 px-4">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold">{stats[item.key]}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
