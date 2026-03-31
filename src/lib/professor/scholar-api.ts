// ============================================================
// 교수 논문 수집: KCI (한국) → Semantic Scholar (영문) 폴백
// ============================================================

const KCI_BASE = 'https://api.odcloud.kr/api/15083283/v1/uddi:9cdf9a0d-6563-4dfe-9957-ecbe798c53e6';
const SCHOLAR_BASE = 'https://api.semanticscholar.org/graph/v1';

// ─── 공통 타입 ───

export interface ProfessorPaper {
  title: string;
  keywords: string[];
  subjectArea: string;
  year: number | null;
  abstract: string | null;
  source: 'kci' | 'semantic_scholar';
}

// ─── KCI (한국학술지인용색인) ───

interface KciArticle {
  '논문명(국문)': string;
  '논문명(영어)': string;
  '저자': string;
  '공동저자': string | null;
  '키워드(국문)': string;
  '키워드(영문)': string;
  '주제분야': string;
  '발행년': number;
  '학술지명(국문)': string;
}

interface KciResponse {
  matchCount: number;
  data: KciArticle[];
}

function getKciKey(): string | null {
  return process.env.KCI_API_KEY || null;
}

/**
 * KCI에서 저자명으로 논문 검색
 */
export async function searchKci(authorName: string, perPage = 30): Promise<ProfessorPaper[]> {
  const apiKey = getKciKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    serviceKey: apiKey,
    page: '1',
    perPage: String(perPage),
    returnType: 'JSON',
    'cond[저자::LIKE]': authorName,
  });

  try {
    const res = await fetch(`${KCI_BASE}?${params}`, {
      headers: { 'User-Agent': 'AllAPlus/1.0' },
    });

    if (!res.ok) return [];

    const data: KciResponse = await res.json();
    if (!data.data || data.data.length === 0) return [];

    return data.data.map((article) => {
      const kwKo = article['키워드(국문)'] || '';
      const kwEn = article['키워드(영문)'] || '';
      const keywords = [...kwKo.split(','), ...kwEn.split(',')]
        .map((k) => k.trim())
        .filter(Boolean);

      return {
        title: article['논문명(국문)'] || article['논문명(영어)'] || '',
        keywords,
        subjectArea: article['주제분야'] || '',
        year: article['발행년'] || null,
        abstract: null, // KCI는 초록 미제공
        source: 'kci' as const,
      };
    });
  } catch (err) {
    console.error('KCI search error:', err);
    return [];
  }
}

// ─── Semantic Scholar (영문 논문) ───

interface ScholarAuthor {
  authorId: string;
  name: string;
  paperCount: number;
}

interface ScholarPaperRaw {
  title: string;
  abstract: string | null;
  year: number | null;
  citationCount: number;
}

async function searchScholarAuthor(name: string): Promise<ScholarAuthor | null> {
  try {
    const res = await fetch(
      `${SCHOLAR_BASE}/author/search?query=${encodeURIComponent(name)}&limit=5`,
      { headers: { 'User-Agent': 'AllAPlus/1.0' } },
    );
    if (!res.ok) return null;

    const data = await res.json();
    const authors = data.data as ScholarAuthor[];
    if (!authors || authors.length === 0) return null;

    return authors.reduce((best, curr) =>
      curr.paperCount > best.paperCount ? curr : best,
    );
  } catch {
    return null;
  }
}

async function getScholarPapers(authorId: string, limit = 20): Promise<ProfessorPaper[]> {
  try {
    const res = await fetch(
      `${SCHOLAR_BASE}/author/${authorId}/papers?fields=title,abstract,year,citationCount&limit=${limit}&sort=citationCount:desc`,
      { headers: { 'User-Agent': 'AllAPlus/1.0' } },
    );
    if (!res.ok) return [];

    const data = await res.json();
    return (data.data || [])
      .map((p: { paper: ScholarPaperRaw }) => p.paper)
      .filter((p: ScholarPaperRaw) => p.title)
      .map((p: ScholarPaperRaw) => ({
        title: p.title,
        keywords: [],
        subjectArea: '',
        year: p.year,
        abstract: p.abstract,
        source: 'semantic_scholar' as const,
      }));
  } catch {
    return [];
  }
}

/**
 * Semantic Scholar에서 저자 논문 검색
 */
export async function searchSemanticScholar(professorName: string): Promise<ProfessorPaper[]> {
  const author = await searchScholarAuthor(professorName);
  if (!author) return [];
  return getScholarPapers(author.authorId);
}

// ─── 통합 수집 ───

/**
 * 교수 논문 통합 수집: KCI → Semantic Scholar
 * KCI에서 한국 논문 (키워드/주제 중심), Semantic Scholar에서 영문 논문 (초록 중심)
 */
export async function collectProfessorPapers(
  professorName: string,
): Promise<{ papers: ProfessorPaper[]; sources: string[] }> {
  const sources: string[] = [];
  let papers: ProfessorPaper[] = [];

  // 1순위: KCI (한국 논문)
  const kciPapers = await searchKci(professorName);
  if (kciPapers.length > 0) {
    papers.push(...kciPapers);
    sources.push(`KCI ${kciPapers.length}편`);
  }

  // 2순위: Semantic Scholar (영문 논문, 초록 포함)
  const scholarPapers = await searchSemanticScholar(professorName);
  if (scholarPapers.length > 0) {
    papers.push(...scholarPapers);
    sources.push(`Semantic Scholar ${scholarPapers.length}편`);
  }

  return { papers, sources };
}
