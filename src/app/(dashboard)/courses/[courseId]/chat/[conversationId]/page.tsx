import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Message, Course } from '@/types/database';
import { ChatInterface } from '@/components/chat/ChatInterface';

interface Props {
  params: Promise<{ courseId: string; conversationId: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { courseId, conversationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // 대화 + 과목 정보
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*, courses(*)')
    .eq('id', conversationId)
    .single();

  if (!conversation || conversation.user_id !== user.id) notFound();

  // 메시지 히스토리
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  const course = conversation.courses as unknown as Course;

  return (
    <div className="h-full -m-6">
      <ChatInterface
        conversationId={conversationId}
        initialMessages={(messages || []) as Message[]}
        courseName={course?.name || '과목'}
      />
    </div>
  );
}
