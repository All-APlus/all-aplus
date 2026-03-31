import { createProvider, getAppDefaultKey } from '@/lib/ai/provider-factory';
import { z } from 'zod';

const MemoryItemSchema = z.object({
  type: z.enum(['concept', 'summary', 'key_term', 'weak_area']),
  content: z.string(),
  importance: z.number().min(0).max(1),
});

const ExtractionResultSchema = z.object({
  memories: z.array(MemoryItemSchema),
});

export type ExtractedMemory = z.infer<typeof MemoryItemSchema>;

const EXTRACTION_PROMPT = `당신은 대학 학습 분석 전문가입니다.
아래 대화에서 학생의 학습에 중요한 정보를 추출하세요.

추출 기준:
- concept: 학생이 배운 핵심 개념 (예: "미분의 정의와 기하학적 의미")
- key_term: 중요 전공 용어 + 간단한 정의
- summary: 대화의 핵심 내용 요약 (1~2문장)
- weak_area: 학생이 이해하지 못하거나 반복 질문한 주제

importance 기준:
- 0.9~1.0: 시험에 나올 핵심, 반복 질문한 취약 영역
- 0.6~0.8: 중요 개념, 용어
- 0.3~0.5: 보조 정보, 일반 요약

반드시 아래 JSON 형식으로만 응답하세요:
{"memories": [{"type": "concept", "content": "...", "importance": 0.8}, ...]}

대화가 학습과 무관하면 빈 배열을 반환하세요: {"memories": []}`;

/**
 * 대화 메시지에서 학습 메모리를 AI로 추출
 */
export async function extractMemories(
  messages: { role: string; content: string }[],
): Promise<ExtractedMemory[]> {
  if (messages.length < 2) return [];

  const conversation = messages
    .map((m) => `${m.role === 'user' ? '학생' : 'AI'}: ${m.content}`)
    .join('\n\n');

  const apiKey = getAppDefaultKey('gemini');
  if (!apiKey) return [];

  const provider = await createProvider('gemini', apiKey);
  const result = await provider.complete({
    systemPrompt: EXTRACTION_PROMPT,
    userPrompt: conversation,
    maxTokens: 1024,
    temperature: 0.3,
  });

  try {
    // JSON 파싱 (코드블록 감싸기 대응)
    const jsonStr = result.content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    const parsed = JSON.parse(jsonStr);
    const validated = ExtractionResultSchema.parse(parsed);
    return validated.memories;
  } catch {
    console.error('Memory extraction parse error:', result.content.substring(0, 200));
    return [];
  }
}
