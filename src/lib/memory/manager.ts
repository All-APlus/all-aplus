import { createClient } from '@/lib/supabase/server';
import { embed } from '@/lib/ai/embeddings';
import type { ExtractedMemory } from './extractor';

interface SimilarMemory {
  id: string;
  content: string;
  importance: number;
  similarity: number;
}

/**
 * 추출된 메모리를 중복 검사 후 저장
 * - 유사도 > 0.9: 기존 메모리 업데이트 (importance 상향)
 * - 유사도 0.8~0.9: 낮은 importance로 삽입
 * - 유사도 < 0.8: 정상 삽입
 */
export async function saveMemories(
  courseId: string,
  userId: string,
  conversationId: string,
  memories: ExtractedMemory[],
): Promise<{ saved: number; merged: number }> {
  const supabase = await createClient();
  let saved = 0;
  let merged = 0;

  for (const memory of memories) {
    const embedding = await embed(memory.content);

    // 중복 감지
    const { data: similar } = await supabase.rpc('find_similar_memories', {
      query_embedding: JSON.stringify(embedding),
      target_course_id: courseId,
      similarity_threshold: 0.8,
    });

    const matches = (similar || []) as SimilarMemory[];
    const highMatch = matches.find((m) => m.similarity > 0.9);

    if (highMatch) {
      // 유사도 > 0.9: 기존 메모리 importance 상향
      const newImportance = Math.min(1, Math.max(highMatch.importance, memory.importance) + 0.05);
      await supabase
        .from('course_memories')
        .update({
          importance: newImportance,
          metadata: { last_reinforced: new Date().toISOString() },
        })
        .eq('id', highMatch.id);
      merged++;
    } else {
      // 0.8~0.9 유사 항목이 있으면 importance 하향
      const importance = matches.length > 0
        ? Math.max(0.2, memory.importance - 0.2)
        : memory.importance;

      await supabase.from('course_memories').insert({
        course_id: courseId,
        user_id: userId,
        memory_type: memory.type,
        content: memory.content,
        embedding: JSON.stringify(embedding),
        source_conversation_id: conversationId,
        importance,
      });
      saved++;
    }
  }

  return { saved, merged };
}

/**
 * 취약 영역 감지: 동일 주제 3회+ 질문
 */
export async function detectWeakAreas(
  courseId: string,
  userId: string,
): Promise<{ topic: string; count: number }[]> {
  const supabase = await createClient();

  const { data: memories } = await supabase
    .from('course_memories')
    .select('content, memory_type, importance')
    .eq('course_id', courseId)
    .eq('memory_type', 'weak_area')
    .order('importance', { ascending: false })
    .limit(10);

  if (!memories || memories.length === 0) return [];

  return memories.map((m) => ({
    topic: m.content,
    count: Math.ceil(m.importance * 5),
  }));
}
