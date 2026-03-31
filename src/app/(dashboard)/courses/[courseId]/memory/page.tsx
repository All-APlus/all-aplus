'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Brain,
  BookOpen,
  AlertTriangle,
  StickyNote,
  Hash,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import type { CourseMemory } from '@/types/database';

const TYPE_CONFIG = {
  concept: { label: '핵심 개념', icon: Brain, color: 'text-blue-600 bg-blue-50' },
  summary: { label: '대화 요약', icon: BookOpen, color: 'text-green-600 bg-green-50' },
  key_term: { label: '용어', icon: Hash, color: 'text-purple-600 bg-purple-50' },
  weak_area: { label: '취약 영역', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  user_note: { label: '메모', icon: StickyNote, color: 'text-amber-600 bg-amber-50' },
} as const;

type MemoryType = keyof typeof TYPE_CONFIG;

export default function MemoryPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [memories, setMemories] = useState<CourseMemory[]>([]);
  const [filter, setFilter] = useState<MemoryType | 'all'>('all');
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMemories = useCallback(async () => {
    const typeParam = filter !== 'all' ? `&type=${filter}` : '';
    const res = await fetch(`/api/memories?courseId=${courseId}${typeParam}`);
    if (res.ok) {
      setMemories(await res.json());
    }
    setLoading(false);
  }, [courseId, filter]);

  useEffect(() => {
    setLoading(true);
    fetchMemories();
  }, [fetchMemories]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    setAdding(true);

    const res = await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, content: newNote.trim() }),
    });

    if (res.ok) {
      setNewNote('');
      fetchMemories();
    }
    setAdding(false);
  };

  const deleteMemory = async (id: string) => {
    const res = await fetch(`/api/memories?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const weakAreas = memories.filter((m) => m.memory_type === 'weak_area');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">학습 기록</h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI가 대화에서 자동 추출한 학습 내용과 취약 영역
          </p>
        </div>
      </div>

      {/* 취약 영역 알림 */}
      {weakAreas.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">취약 영역 감지</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {weakAreas.map((w) => (
              <span key={w.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md">
                {w.content}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 메모 추가 */}
      <div className="flex gap-2 mb-6">
        <Input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="학습 메모를 직접 추가하세요..."
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
          disabled={adding}
        />
        <Button onClick={addNote} disabled={adding || !newNote.trim()} size="sm">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 mb-4 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          전체
        </Button>
        {(Object.entries(TYPE_CONFIG) as [MemoryType, typeof TYPE_CONFIG[MemoryType]][]).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(key)}
            >
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Button>
          );
        })}
      </div>

      {/* 메모리 목록 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <Brain className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold mb-1">아직 학습 기록이 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            AI와 대화하면 핵심 개념이 자동으로 기록됩니다
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map((mem) => {
            const config = TYPE_CONFIG[mem.memory_type as MemoryType];
            const Icon = config?.icon ?? Brain;
            const colorClass = config?.color ?? 'text-gray-600 bg-gray-50';

            return (
              <Card key={mem.id}>
                <CardContent className="flex items-start justify-between py-3 px-4 gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          {config?.label}
                        </span>
                        <span className="text-xs text-gray-300">
                          중요도 {Math.round(mem.importance * 100)}%
                        </span>
                      </div>
                      <p className="text-sm">{mem.content}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMemory(mem.id)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
