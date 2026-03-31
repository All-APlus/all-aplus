import { retrieveChunks, type RetrievedChunk } from '@/lib/rag/retriever';
import { embed } from '@/lib/ai/embeddings';
import { createClient } from '@/lib/supabase/server';
import type { SourceReference } from '@/lib/ai/types';

interface ContextResult {
  systemPrompt: string;
  sources: SourceReference[];
}

/**
 * 시스템 프롬프트를 조립한다.
 * - 기본 지시문
 * - 과목 정보
 * - RAG 컨텍스트 (관련 문서 청크)
 */
export async function buildContext(options: {
  courseId: string;
  courseName: string;
  professor?: string | null;
  systemContext?: string | null;
  userMessage: string;
}): Promise<ContextResult> {
  const parts: string[] = [
    '당신은 대학생의 AI 학습 비서 "올A+"입니다.',
    '학생이 이해하기 쉽도록 친절하고 명확하게 설명해주세요.',
    '한국어로 답변하되, 전공 용어는 영어를 병기해도 좋습니다.',
  ];

  // 과목 정보
  parts.push(`\n## 현재 과목: ${options.courseName}`);
  if (options.professor) parts.push(`담당 교수: ${options.professor}`);
  if (options.systemContext) parts.push(`\n## 과목 지시사항\n${options.systemContext}`);

  // Memory: 관련 학습 기록 검색
  try {
    const queryEmbedding = await embed(options.userMessage);
    const supabase = await createClient();

    const { data: memories } = await supabase.rpc('match_course_memories', {
      query_embedding: JSON.stringify(queryEmbedding),
      target_course_id: options.courseId,
      match_threshold: 0.4,
      match_count: 3,
    });

    if (memories && memories.length > 0) {
      parts.push('\n## 학습 기록');
      for (const mem of memories as { memory_type: string; content: string }[]) {
        const label = mem.memory_type === 'weak_area' ? '(취약)' : '';
        parts.push(`- ${label} ${mem.content}`);
      }
    }

    // 취약 영역 별도 강조
    const { data: weakAreas } = await supabase
      .from('course_memories')
      .select('content')
      .eq('course_id', options.courseId)
      .eq('memory_type', 'weak_area')
      .order('importance', { ascending: false })
      .limit(3);

    if (weakAreas && weakAreas.length > 0) {
      parts.push('\n## 어려워하는 부분');
      for (const w of weakAreas) {
        parts.push(`- ${w.content}`);
      }
      parts.push('→ 이 주제는 특히 쉽게 설명해주세요.');
    }
  } catch (err) {
    console.error('Memory context build error:', err);
  }

  // RAG: 관련 문서 청크 검색
  let sources: SourceReference[] = [];

  try {
    const chunks = await retrieveChunks(options.userMessage, options.courseId, {
      threshold: 0.4,
      count: 5,
    });

    if (chunks.length > 0) {
      parts.push('\n## 참고 자료');
      sources = chunks.map((chunk, i) => {
        const sourceLabel = formatSource(chunk, i + 1);
        parts.push(sourceLabel.context);
        return sourceLabel.reference;
      });
      parts.push(
        '\n## 지시사항',
        '- 위 참고 자료를 활용하여 답변하세요.',
        '- 자료에서 인용할 때 [1], [2] 형식으로 출처를 명시하세요.',
        '- 자료에 없는 내용은 "자료에는 없지만"으로 시작하여 구분해주세요.',
      );
    }
  } catch (err) {
    console.error('RAG context build error:', err);
    // RAG 실패 시 기본 프롬프트로 진행
  }

  return {
    systemPrompt: parts.join('\n'),
    sources,
  };
}

function formatSource(
  chunk: RetrievedChunk,
  index: number,
): { context: string; reference: SourceReference } {
  const fileName = chunk.fileName || '알 수 없는 파일';
  const pageInfo = chunk.pageNumber ? `, p.${chunk.pageNumber}` : '';
  const preview = chunk.content.length > 100
    ? chunk.content.slice(0, 100) + '...'
    : chunk.content;

  return {
    context: `[${index}] 출처: ${fileName}${pageInfo}\n${chunk.content}`,
    reference: {
      id: chunk.id,
      contentPreview: preview,
      sourceFile: fileName,
      page: chunk.pageNumber ?? undefined,
    },
  };
}
