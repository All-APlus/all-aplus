'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function CourseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Course error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">과목을 불러올 수 없어요</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        과목 정보를 가져오는 중 오류가 발생했습니다.
        <br />
        과목이 삭제되었거나 접근 권한이 없을 수 있어요.
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          내 과목으로
        </Link>
        <Button onClick={reset}>다시 시도</Button>
      </div>
    </div>
  );
}
