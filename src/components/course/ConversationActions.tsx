'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

interface ConversationActionsProps {
  conversationId: string;
  title: string;
  isPinned: boolean;
}

export function ConversationActions({
  conversationId,
  title,
  isPinned,
}: ConversationActionsProps) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleRename = async () => {
    if (!newTitle.trim() || newTitle === title) {
      setRenaming(false);
      return;
    }

    const res = await fetch('/api/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conversationId, title: newTitle.trim() }),
    });

    if (res.ok) {
      toast.success('대화 이름이 변경되었습니다');
      router.refresh();
      toast.success('대화 이름이 변경되었습니다');
    } else {
      toast.error('이름 변경에 실패했습니다');
    }
    setRenaming(false);
  };

  const handleTogglePin = async () => {
    const res = await fetch('/api/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conversationId, is_pinned: !isPinned }),
    });

    if (res.ok) {
      toast.success(isPinned ? '고정이 해제되었습니다' : '대화가 고정되었습니다');
      router.refresh();
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/conversations?id=${conversationId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      toast.success('대화가 삭제되었습니다');
      router.refresh();
    } else {
      toast.error('삭제에 실패했습니다');
    }
  };

  if (renaming) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
        <input
          autoFocus
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') setRenaming(false);
          }}
          onBlur={handleRename}
          className="text-sm font-medium border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full max-w-[200px]"
        />
      </div>
    );
  }

  return (
    <>
      <div onClick={(e) => e.preventDefault()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom">
            <DropdownMenuItem onClick={() => { setNewTitle(title); setRenaming(true); }}>
              <Pencil className="h-4 w-4" />
              이름 변경
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleTogglePin}>
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned ? '고정 해제' : '고정'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="대화를 삭제하시겠습니까?"
        description="이 대화의 모든 메시지가 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        onConfirm={handleDelete}
      />
    </>
  );
}
