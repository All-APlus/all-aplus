import { createProvider, getAppDefaultKey } from '@/lib/ai/provider-factory';
import type { ProfessorPaper } from './scholar-api';

export interface ProfessorAnalysis {
  researchAreas: string[];
  academicStance: string;
  keyTopics: string[];
  papersAnalyzed: number;
  rawAnalysis: string;
  dataSources: string[];
}

const ANALYSIS_PROMPT = `당신은 학술 연구 분석 전문가입니다.
아래 교수의 논문 데이터를 분석하여 연구 성향을 추출하세요.

입력 데이터는 두 종류입니다:
- KCI 논문: 제목 + 키워드 + 주제분야 (초록 없음)
- Semantic Scholar 논문: 제목 + 초록 (키워드 없음)

반드시 아래 JSON 형식으로만 응답하세요:
{
  "research_areas": ["연구 분야 1", "연구 분야 2", ...],
  "academic_stance": "이 교수의 전반적인 학문적 관점/방법론 (1~2문장)",
  "key_topics": ["자주 다루는 주제 1", "주제 2", ...]
}

분석 기준:
- research_areas: 주요 연구 분야 (3~5개, 한국어)
- academic_stance: 선호하는 방법론, 이론적 관점, 연구 성향
- key_topics: 논문에서 반복적으로 등장하는 구체적 주제/키워드 (5~10개, 한국어 우선)`;

/**
 * 논문 데이터로 교수 성향 AI 분석
 */
export async function analyzeProfessor(
  professorName: string,
  papers: ProfessorPaper[],
  dataSources: string[],
): Promise<ProfessorAnalysis> {
  const paperTexts = papers.slice(0, 20).map((p, i) => {
    const parts = [`[${i + 1}] "${p.title}" (${p.year || '연도 미상'})`];
    if (p.keywords.length > 0) parts.push(`키워드: ${p.keywords.join(', ')}`);
    if (p.subjectArea) parts.push(`분야: ${p.subjectArea}`);
    if (p.abstract) parts.push(`초록: ${p.abstract}`);
    parts.push(`출처: ${p.source === 'kci' ? 'KCI(국내)' : 'Semantic Scholar(해외)'}`);
    return parts.join('\n');
  }).join('\n\n');

  const apiKey = getAppDefaultKey('gemini');
  if (!apiKey) throw new Error('AI API 키가 설정되지 않았습니다');

  const provider = await createProvider('gemini', apiKey);
  const result = await provider.complete({
    systemPrompt: ANALYSIS_PROMPT,
    userPrompt: `교수명: ${professorName}\n수집 소스: ${dataSources.join(', ')}\n\n논문 데이터:\n${paperTexts}`,
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
      dataSources,
    };
  } catch {
    return {
      researchAreas: [],
      academicStance: result.content.substring(0, 200),
      keyTopics: [],
      papersAnalyzed: papers.length,
      rawAnalysis: result.content,
      dataSources,
    };
  }
}
