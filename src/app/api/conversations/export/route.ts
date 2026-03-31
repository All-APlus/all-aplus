import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get('id');
  if (!conversationId) {
    return NextResponse.json({ error: '대화 ID가 필요합니다' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  // Fetch conversation with course info
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*, courses(name, professor, semester)')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: '대화를 찾을 수 없습니다' }, { status: 404 });
  }

  // Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: '메시지가 없습니다' }, { status: 404 });
  }

  const course = conversation.courses as { name: string; professor: string; semester: string } | null;

  // Build Markdown
  let md = `# ${conversation.title || '대화'}\n\n`;

  if (course) {
    md += `- **과목**: ${course.name}\n`;
    if (course.professor) md += `- **교수**: ${course.professor}\n`;
    md += `- **학기**: ${course.semester}\n`;
  }

  md += `- **내보낸 날짜**: ${format(new Date(), 'yyyy년 M월 d일 HH:mm', { locale: ko })}\n`;
  md += `- **메시지 수**: ${messages.length}개\n\n`;
  md += `---\n\n`;

  for (const msg of messages) {
    const role = msg.role === 'user' ? '🧑 나' : '🤖 AI';
    const time = format(new Date(msg.created_at), 'HH:mm');
    md += `### ${role} (${time})\n\n${msg.content}\n\n`;
  }

  md += `---\n*올A+에서 내보냄*\n`;

  const fileName = `${(conversation.title || '대화').replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim()}.md`;

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
