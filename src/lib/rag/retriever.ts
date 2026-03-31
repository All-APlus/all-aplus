import { createClient } from '@/lib/supabase/server';
import { embed } from '@/lib/ai/embeddings';

export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  metadata: Record<string, unknown>;
  similarity: number;
  fileName?: string;
}

/**
 * 사용자 쿼리로 관련 문서 청크 검색
 * 1. 쿼리 임베딩 생성
 * 2. match_document_chunks RPC 호출
 * 3. 파일명 조인해서 반환
 */
export async function retrieveChunks(
  query: string,
  courseId: string,
  options?: { threshold?: number; count?: number },
): Promise<RetrievedChunk[]> {
  const { threshold = 0.5, count = 5 } = options ?? {};

  const queryEmbedding = await embed(query);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    target_course_id: courseId,
    match_threshold: threshold,
    match_count: count,
  });

  if (error) {
    console.error('RAG retrieval error:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 파일명 조회
  const docIds = [...new Set(data.map((d: { document_id: string }) => d.document_id))];
  const { data: docs } = await supabase
    .from('documents')
    .select('id, file_name')
    .in('id', docIds);

  const docMap = new Map(docs?.map((d: { id: string; file_name: string }) => [d.id, d.file_name]) ?? []);

  return data.map((chunk: {
    id: string;
    document_id: string;
    content: string;
    chunk_index: number;
    page_number: number | null;
    metadata: Record<string, unknown>;
    similarity: number;
  }) => ({
    id: chunk.id,
    documentId: chunk.document_id,
    content: chunk.content,
    chunkIndex: chunk.chunk_index,
    pageNumber: chunk.page_number,
    metadata: chunk.metadata,
    similarity: chunk.similarity,
    fileName: docMap.get(chunk.document_id),
  }));
}
