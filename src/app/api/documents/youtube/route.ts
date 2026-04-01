import { createClient } from '@/lib/supabase/server';
import { fetchYouTubeTranscript, extractVideoId } from '@/lib/rag/youtube';
import { chunkText } from '@/lib/rag/chunker';
import { embedBatch } from '@/lib/ai/embeddings';
import { checkAndIncrementUsage, rateLimitResponse } from '@/lib/usage-tracker';
import { validateYouTubeUrl } from '@/lib/validation';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { url, courseId } = await request.json();

  if (!url || !courseId) {
    return Response.json({ error: 'url과 courseId가 필요합니다' }, { status: 400 });
  }

  // URL 화이트리스트 검증
  const urlCheck = validateYouTubeUrl(url);
  if (!urlCheck.valid) {
    return Response.json({ error: urlCheck.error }, { status: 400 });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return Response.json({ error: '유효한 YouTube URL이 아닙니다' }, { status: 400 });
  }

  // 일일 사용량 체크
  const usage = await checkAndIncrementUsage(supabase as never, user.id, 'youtube');
  if (!usage.allowed) {
    return rateLimitResponse('YouTube', usage.current, usage.limit);
  }

  // 과목 소유권 확인
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .single();

  if (!course) {
    return Response.json({ error: '과목을 찾을 수 없습니다' }, { status: 404 });
  }

  // 중복 체크
  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('course_id', courseId)
    .eq('file_name', `youtube-${videoId}`)
    .single();

  if (existing) {
    return Response.json({ error: '이미 추가된 영상입니다' }, { status: 409 });
  }

  // documents 레코드 생성
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      course_id: courseId,
      user_id: user.id,
      file_name: `youtube-${videoId}`,
      file_type: 'youtube',
      file_size: 0,
      status: 'processing',
      metadata: { youtube_url: url, video_id: videoId },
    })
    .select()
    .single();

  if (docErr || !doc) {
    return Response.json({ error: '문서 생성 실패' }, { status: 500 });
  }

  // 비동기 처리
  processYouTube(supabase, doc.id, courseId, url).catch((err) => {
    console.error('YouTube processing error:', err);
  });

  return Response.json({ documentId: doc.id, status: 'processing' });
}

async function processYouTube(
  supabase: Awaited<ReturnType<typeof createClient>>,
  docId: string,
  courseId: string,
  url: string,
) {
  try {
    // 1. 자막 추출
    const result = await fetchYouTubeTranscript(url);

    // 2. 청킹
    const chunks = chunkText(result.text);
    if (chunks.length === 0) {
      throw new Error('자막에서 텍스트를 추출할 수 없습니다');
    }

    // 3. 임베딩
    const embeddings = await embedBatch(chunks.map((c) => c.content));

    // 4. document_chunks 저장
    const chunkRows = chunks.map((chunk, i) => ({
      document_id: docId,
      course_id: courseId,
      content: chunk.content,
      embedding: JSON.stringify(embeddings[i]),
      chunk_index: chunk.chunkIndex,
      page_number: null,
      metadata: { source: 'youtube', video_id: result.videoId },
    }));

    for (let i = 0; i < chunkRows.length; i += 50) {
      const batch = chunkRows.slice(i, i + 50);
      const { error: insertErr } = await supabase
        .from('document_chunks')
        .insert(batch);
      if (insertErr) throw new Error(`Chunk insert failed: ${insertErr.message}`);
    }

    // 5. 완료
    await supabase
      .from('documents')
      .update({
        status: 'completed',
        chunk_count: chunks.length,
        file_size: result.text.length,
        file_name: result.title,
      })
      .eq('id', docId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from('documents')
      .update({ status: 'failed', error_message: message })
      .eq('id', docId);
  }
}
