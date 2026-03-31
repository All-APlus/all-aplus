const SCHOLAR_BASE = 'https://api.semanticscholar.org/graph/v1';

export interface ScholarPaper {
  title: string;
  abstract: string | null;
  year: number | null;
  citationCount: number;
  url: string;
}

export interface ScholarAuthor {
  authorId: string;
  name: string;
  paperCount: number;
  citationCount: number;
}

/**
 * Semantic Scholar에서 저자 검색
 */
export async function searchAuthor(name: string): Promise<ScholarAuthor | null> {
  const res = await fetch(
    `${SCHOLAR_BASE}/author/search?query=${encodeURIComponent(name)}&limit=5`,
    { headers: { 'User-Agent': 'AllAPlus/1.0' } },
  );

  if (!res.ok) return null;

  const data = await res.json();
  const authors = data.data as ScholarAuthor[];

  if (!authors || authors.length === 0) return null;

  // 가장 논문 수가 많은 저자 선택
  return authors.reduce((best, curr) =>
    curr.paperCount > best.paperCount ? curr : best,
  );
}

/**
 * 저자의 논문 목록 + 초록 가져오기
 */
export async function getAuthorPapers(
  authorId: string,
  limit = 20,
): Promise<ScholarPaper[]> {
  const res = await fetch(
    `${SCHOLAR_BASE}/author/${authorId}/papers?fields=title,abstract,year,citationCount,url&limit=${limit}&sort=citationCount:desc`,
    { headers: { 'User-Agent': 'AllAPlus/1.0' } },
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.data || [])
    .map((p: { paper: ScholarPaper }) => p.paper)
    .filter((p: ScholarPaper) => p.abstract);
}

/**
 * 교수명으로 논문 초록 수집
 */
export async function collectProfessorPapers(
  professorName: string,
): Promise<{ papers: ScholarPaper[]; authorId: string | null }> {
  const author = await searchAuthor(professorName);
  if (!author) {
    return { papers: [], authorId: null };
  }

  const papers = await getAuthorPapers(author.authorId);
  return { papers, authorId: author.authorId };
}
