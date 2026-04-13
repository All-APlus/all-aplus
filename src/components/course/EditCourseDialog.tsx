'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Settings, Pencil, Archive, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Course } from '@/types/database';

const COURSE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#78716c',
];

interface EditCourseDialogProps {
  course: Course;
}

export function EditCourseDialog({ course }: EditCourseDialogProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(course.name);
  const [code, setCode] = useState(course.code || '');
  const [professor, setProfessor] = useState(course.professor || '');
  const [semester, setSemester] = useState(course.semester);
  const [color, setColor] = useState(course.color || '#6366f1');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const res = await fetch('/api/courses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: course.id,
        name: name.trim(),
        code: code.trim() || null,
        professor: professor.trim() || null,
        semester,
        color,
      }),
    });

    if (res.ok) {
      toast.success('과목 정보가 수정되었습니다');
      setEditOpen(false);
      router.refresh();
    } else {
      toast.error('수정에 실패했습니다');
    }
    setLoading(false);
  };

  const handleArchive = async () => {
    const res = await fetch('/api/courses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: course.id, is_archived: true }),
    });

    if (res.ok) {
      toast.success('과목이 아카이브되었습니다');
      router.push('/dashboard');
      router.refresh();
    } else {
      toast.error('아카이브에 실패했습니다');
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/courses?id=${course.id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      toast.success('과목이 삭제되었습니다');
      router.push('/dashboard');
      router.refresh();
    } else {
      toast.error('삭제에 실패했습니다');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-8 w-8" title="과목 설정" />
          }
        >
          <Settings className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            과목 편집
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive}>
            <Archive className="h-4 w-4" />
            아카이브
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            과목 삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 편집 다이얼로그 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>과목 편집</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">과목명 *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">학수번호</Label>
                <Input
                  id="edit-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-semester">학기 *</Label>
                <Input
                  id="edit-semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-professor">담당 교수</Label>
              <Input
                id="edit-professor"
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
              {loading ? '저장 중...' : '저장'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="과목을 삭제하시겠습니까?"
        description="이 과목의 모든 대화, 문서, 학습 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="과목 삭제"
        onConfirm={handleDelete}
      />
    </>
  );
}
