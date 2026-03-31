import { createClient } from '@/lib/supabase/server';
import { parseDocument } from '@/lib/rag/parser';
import { chunkText } from '@/lib/rag/chunker';
import { embedBatch } from '@/lib/ai/embeddings';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'text/plain': '.txt',
  'text/markdown': '.md',
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const courseId = formData.get('courseId') as string | null;

  if (!file || !courseId) {
    return Response.json({ error: 'file과 courseId가 필요합니다' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: '파일 크기는 10MB 이하만 가능합니다' }, { status: 400 });
  }

  if (!ALLOWED_TYPES[file.type] && !file.name.match(/\.(pdf|docx|pptx|txt|md)$/i)) {
    return Response.json({ error: '지원하지 않는 파일 형식입니다' }, { status: 400 });
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

  // 1. documents 레코드 생성 (pending)
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      course_id: courseId,
      user_id: user.id,
      file_name: file.name,
      file_type: file.type || file.name.split('.').pop() || 'unknown',
      file_size: file.size,
      status: 'pending',
    })
    .select()
    .single();

  if (docErr || !doc) {
    return Response.json({ error: '문서 생성 실패' }, { status: 500 });
  }

  // 비동기 처리 시작 (응답은 즉시 반환)
  processDocument(supabase, doc.id, courseId, user.id, file).catch((err) => {
    console.error('Document processing error:', err);
  });

  return Response.json({ documentId: doc.id, status: 'processing' });
}

async function processDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  docId: string,
  courseId: string,
  userId: string,
  file: File,
) {
  try {
    // status → processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', docId);

    // 2. Supabase Storage 업로드
    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `${userId}/${courseId}/${docId}/${file.name}`;

    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, { contentType: file.type });

    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    await supabase
      .from('documents')
      .update({ storage_path: storagePath })
      .eq('id', docId);

    // 3. 파싱
    const parsed = await parseDocument(buffer, file.type || file.name);

    // 4. 청킹
    const chunks = chunkText(parsed.text);
    if (chunks.length === 0) {
      throw new Error('문서에서 텍스트를 추출할 수 없습니다');
    }

    // 5. 임베딩 (배치)
    const embeddings = await embedBatch(chunks.map((c) => c.content));

    // 6. document_chunks 저장
    const chunkRows = chunks.map((chunk, i) => ({
      document_id: docId,
      course_id: courseId,
      content: chunk.content,
      embedding: JSON.stringify(embeddings[i]),
      chunk_index: chunk.chunkIndex,
      page_number: chunk.pageNumber ?? null,
      metadata: {},
    }));

    // 50개씩 배치 삽입
    for (let i = 0; i < chunkRows.length; i += 50) {
      const batch = chunkRows.slice(i, i + 50);
      const { error: insertErr } = await supabase
        .from('document_chunks')
        .insert(batch);
      if (insertErr) throw new Error(`Chunk insert failed: ${insertErr.message}`);
    }

    // 7. 완료
    await supabase
      .from('documents')
      .update({
        status: 'completed',
        page_count: parsed.pageCount ?? null,
        chunk_count: chunks.length,
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
