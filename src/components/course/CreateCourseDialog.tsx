'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const COURSE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#78716c',
];

export function CreateCourseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [professor, setProfessor] = useState('');
  const [semester, setSemester] = useState('2026-1');
  const [color, setColor] = useState(COURSE_COLORS[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('courses').insert({
      user_id: user.id,
      name: name.trim(),
      code: code.trim() || null,
      professor: professor.trim() || null,
      semester,
      color,
    });

    if (!error) {
      setOpen(false);
      resetForm();
      router.refresh();
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setProfessor('');
    setSemester('2026-1');
    setColor(COURSE_COLORS[0]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4 mr-2" />
        새 과목 추가
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 과목 만들기</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course-name">과목명 *</Label>
            <Input
              id="course-name"
              placeholder="예: 경영학원론"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course-code">학수번호</Label>
              <Input
                id="course-code"
                placeholder="예: BIZ101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-semester">학기 *</Label>
              <Input
                id="course-semester"
                placeholder="2026-1"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-professor">담당 교수</Label>
            <Input
              id="course-professor"
              placeholder="예: 김교수"
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>색상</Label>
            <div className="flex gap-2 flex-wrap">
              {COURSE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-7 w-7 rounded-full transition-all',
                    color === c
                      ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110'
                      : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '생성 중...' : '과목 만들기'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
