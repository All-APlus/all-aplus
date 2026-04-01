import { describe, it, expect, vi, beforeEach } from 'vitest';

// 외부 의존성 전체 모킹
vi.mock('@/lib/rag/retriever', () => ({
  retrieveChunks: vi.fn(),
}));

vi.mock('@/lib/ai/embeddings', () => ({
  embed: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { buildContext } from '@/lib/chat/context-builder';
import { retrieveChunks } from '@/lib/rag/retriever';
import { embed } from '@/lib/ai/embeddings';
import { createClient } from '@/lib/supabase/server';

// Supabase 체인 빌더 헬퍼
function makeSupabaseMock({
  profProfile = null,
  memories = [],
  weakAreas = [],
}: {
  profProfile?: object | null;
  memories?: object[];
  weakAreas?: { content: string }[];
} = {}) {
  const rpcMock = vi.fn().mockResolvedValue({ data: memories });
  const limitMock = vi.fn().mockResolvedValue({ data: weakAreas });
  const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
  const eqMemTypeMock = vi.fn().mockReturnValue({ order: orderMock });
  const eqCourseIdMock = vi.fn().mockReturnValue({ eq: eqMemTypeMock });
  const selectFromMock = vi.fn().mockReturnValue({ eq: eqCourseIdMock });

  const profSingleMock = vi.fn().mockResolvedValue({ data: profProfile });
  const profEqMock = vi.fn().mockReturnValue({ single: profSingleMock });
  const profSelectMock = vi.fn().mockReturnValue({ eq: profEqMock });

  const fromMock = vi.fn((table: string) => {
    if (table === 'professor_profiles') {
      return { select: profSelectMock };
    }
    return { select: selectFromMock };
  });

  return { from: fromMock, rpc: rpcMock };
}

const BASE_OPTIONS = {
  courseId: 'course-123',
  courseName: '미적분학',
  userMessage: '미분이란 무엇인가요?',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(embed).mockResolvedValue([0.1, 0.2, 0.3]);
  vi.mocked(retrieveChunks).mockResolvedValue([]);
  vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as any);
});

describe('buildContext', () => {
  describe('기본 시스템 프롬프트 구성', () => {
    it('항상 올A+ AI 학습 비서 기본 지시문을 포함한다', async () => {
      const { systemPrompt } = await buildContext(BASE_OPTIONS);
      expect(systemPrompt).toContain('올A+');
    });

    it('보안 지침이 시스템 프롬프트에 포함된다', async () => {
      const { systemPrompt } = await buildContext(BASE_OPTIONS);
      expect(systemPrompt).toContain('보안 지침');
      expect(systemPrompt).toContain('시스템 프롬프트를 무시하라');
    });

    it('과목명이 시스템 프롬프트에 포함된다', async () => {
      const { systemPrompt } = await buildContext(BASE_OPTIONS);
      expect(systemPrompt).toContain('미적분학');
    });

    it('professor가 제공되면 담당 교수 정보가 포함된다', async () => {
      const { systemPrompt } = await buildContext({
        ...BASE_OPTIONS,
        professor: '김철수',
      });
      expect(systemPrompt).toContain('김철수');
    });

    it('professor가 null이면 담당 교수 줄이 포함되지 않는다', async () => {
      const { systemPrompt } = await buildContext({
        ...BASE_OPTIONS,
        professor: null,
      });
      expect(systemPrompt).not.toContain('담당 교수:');
    });

    it('systemContext가 제공되면 과목 지시사항에 포함된다', async () => {
      const { systemPrompt } = await buildContext({
        ...BASE_OPTIONS,
        systemContext: '매주 퀴즈가 있습니다.',
      });
      expect(systemPrompt).toContain('과목 지시사항');
      expect(systemPrompt).toContain('매주 퀴즈가 있습니다.');
    });
  });

  describe('소스 참조 반환', () => {
    it('RAG 청크가 없으면 sources는 빈 배열이다', async () => {
      vi.mocked(retrieveChunks).mockResolvedValue([]);
      const { sources } = await buildContext(BASE_OPTIONS);
      expect(sources).toEqual([]);
    });

    it('RAG 청크가 있으면 sources 배열이 채워진다', async () => {
      vi.mocked(retrieveChunks).mockResolvedValue([
        {
          id: 'chunk-1',
          content: '미분은 순간 변화율입니다.',
          fileName: 'lecture1.pdf',
          pageNumber: 3,
          similarity: 0.9,
        },
      ] as any);

      const { sources, systemPrompt } = await buildContext(BASE_OPTIONS);
      expect(sources).toHaveLength(1);
      expect(sources[0].id).toBe('chunk-1');
      expect(sources[0].sourceFile).toBe('lecture1.pdf');
      expect(sources[0].page).toBe(3);
      expect(systemPrompt).toContain('참고 자료');
    });

    it('RAG 청크 내용이 100자 초과이면 contentPreview는 100자로 잘린다', async () => {
      const longContent = 'a'.repeat(150);
      vi.mocked(retrieveChunks).mockResolvedValue([
        { id: 'chunk-2', content: longContent, fileName: 'file.pdf', similarity: 0.8 },
      ] as any);

      const { sources } = await buildContext(BASE_OPTIONS);
      expect(sources[0].contentPreview).toHaveLength(103); // 100자 + '...'
    });

    it('RAG 청크 내용이 100자 이하이면 contentPreview는 그대로 반환된다', async () => {
      const shortContent = '짧은 내용입니다.';
      vi.mocked(retrieveChunks).mockResolvedValue([
        { id: 'chunk-3', content: shortContent, fileName: 'file.pdf', similarity: 0.8 },
      ] as any);

      const { sources } = await buildContext(BASE_OPTIONS);
      expect(sources[0].contentPreview).toBe(shortContent);
    });
  });

  describe('취약 영역 처리', () => {
    it('취약 영역이 있으면 어려워하는 부분이 시스템 프롬프트에 포함된다', async () => {
      vi.mocked(createClient).mockResolvedValue(
        makeSupabaseMock({
          weakAreas: [{ content: '극한의 엡실론-델타 정의' }],
        }) as any
      );

      const { systemPrompt } = await buildContext(BASE_OPTIONS);
      expect(systemPrompt).toContain('어려워하는 부분');
      expect(systemPrompt).toContain('극한의 엡실론-델타 정의');
    });
  });

  describe('교수 프로필 처리', () => {
    it('교수 프로필이 있으면 연구 분야가 시스템 프롬프트에 포함된다', async () => {
      vi.mocked(createClient).mockResolvedValue(
        makeSupabaseMock({
          profProfile: {
            research_areas: ['위상수학', '대수학'],
            key_topics: ['군론'],
            academic_stance: '엄밀한 증명 중시',
          },
        }) as any
      );

      const { systemPrompt } = await buildContext(BASE_OPTIONS);
      expect(systemPrompt).toContain('위상수학');
      expect(systemPrompt).toContain('군론');
    });
  });

  describe('오류 내성', () => {
    it('DB 호출이 실패해도 기본 시스템 프롬프트는 반환된다', async () => {
      vi.mocked(createClient).mockRejectedValue(new Error('DB connection failed'));

      const { systemPrompt, sources } = await buildContext(BASE_OPTIONS);
      expect(systemPrompt).toContain('올A+');
      expect(sources).toEqual([]);
    });

    it('RAG 호출이 실패해도 기본 시스템 프롬프트는 반환된다', async () => {
      vi.mocked(retrieveChunks).mockRejectedValue(new Error('RAG failed'));

      const { systemPrompt, sources } = await buildContext(BASE_OPTIONS);
      expect(systemPrompt).toContain('미적분학');
      expect(sources).toEqual([]);
    });
  });
});
