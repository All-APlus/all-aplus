'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/callback`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">이메일을 확인하세요</h3>
              <p className="text-sm text-muted-foreground">
                <strong>{email}</strong>로 비밀번호 재설정 링크를 보냈습니다.
                <br />
                메일함을 확인해주세요.
              </p>
            </div>
            <Link href="/login">
              <Button variant="outline">로그인으로 돌아가기</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-xl">비밀번호 재설정</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">가입한 이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '전송 중...' : '재설정 링크 보내기'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-indigo-600 hover:underline">
          로그인으로 돌아가기
        </Link>
      </CardFooter>
    </Card>
  );
}
