import { createProvider, getAppDefaultKey } from '@/lib/ai/provider-factory';
import type { ScholarPaper } from './scholar-api';

export interface ProfessorAnalysis {
  researchAreas: string[];
  academicStance: string;
  keyTopics: string[];
  papersAnalyzed: number;
  rawAnalysis: string;
}

const ANALYSIS_PROMPT = `당신은 학술 연구 분석 전문가입니다.
아래 교수의 논문 초록들을 분석하여 다음 정보를 추출하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "research_areas": ["연구 분야 1", "연구 분야 2", ...],
  "academic_stance": "이 교수의 전반적인 학문적 관점/방법론 (1~2문장)",
  "key_topics": ["자주 다루는 주제 1", "주제 2", ...]
}

분석 기준:
- research_areas: 주요 연구 분야 (3~5개)
- academic_stance: 선호하는 방법론, 이론적 관점, 연구 성향
- key_topics: 논문에서 반복적으로 등장하는 구체적 주제/키워드 (5~10개)`;

/**
 * 논문 초록으로 교수 성향 AI 분석
 */
export async function analyzeProfessor(
  professorName: string,
  papers: ScholarPaper[],
): Promise<ProfessorAnalysis> {
  const abstracts = papers
    .slice(0, 15)
    .map((p, i) => `[${i + 1}] "${p.title}" (${p.year})\n${p.abstract}`)
    .join('\n\n');

  const apiKey = getAppDefaultKey('gemini');
  if (!apiKey) throw new Error('AI API 키가 설정되지 않았습니다');

  const provider = await createProvider('gemini', apiKey);
  const result = await provider.complete({
    systemPrompt: ANALYSIS_PROMPT,
    userPrompt: `교수명: ${professorName}\n\n논문 초록:\n${abstracts}`,
    maxTokens: 1024,
    temperature: 0.3,
  });

  try {
    const jsonStr = result.content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    const parsed = JSON.parse(jsonStr);

    return {
      researchAreas: parsed.research_areas || [],
      academicStance: parsed.academic_stance || '',
      keyTopics: parsed.key_topics || [],
      papersAnalyzed: papers.length,
      rawAnalysis: result.content,
    };
  } catch {
    return {
      researchAreas: [],
      academicStance: result.content.substring(0, 200),
      keyTopics: [],
      papersAnalyzed: papers.length,
      rawAnalysis: result.content,
    };
  }
}
