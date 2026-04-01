import { describe, it, expect, vi, beforeEach } from 'vitest';

// provider-factory와 getAppDefaultKey를 모킹
vi.mock('@/lib/ai/provider-factory', () => ({
  getAppDefaultKey: vi.fn(),
  createProvider: vi.fn(),
}));

import { extractMemories } from '@/lib/memory/extractor';
import { getAppDefaultKey, createProvider } from '@/lib/ai/provider-factory';

const mockComplete = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAppDefaultKey).mockReturnValue('fake-api-key');
  vi.mocked(createProvider).mockResolvedValue({ complete: mockComplete } as any);
});

describe('extractMemories', () => {
  describe('메시지 수 검증', () => {
    it('메시지가 0개이면 빈 배열을 반환한다', async () => {
      const result = await extractMemories([]);
      expect(result).toEqual([]);
    });

    it('메시지가 1개이면 빈 배열을 반환한다 (대화 성립 안 됨)', async () => {
      const result = await extractMemories([{ role: 'user', content: '안녕' }]);
      expect(result).toEqual([]);
    });

    it('메시지가 2개 이상이어야 AI 호출이 일어난다', async () => {
      mockComplete.mockResolvedValue({ content: '{"memories": []}' });
      await extractMemories([
        { role: 'user', content: '미분이 뭐야?' },
        { role: 'assistant', content: '미분은...' },
      ]);
      expect(mockComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('API 키 없음', () => {
    it('gemini API 키가 없으면 빈 배열을 반환하고 AI를 호출하지 않는다', async () => {
      vi.mocked(getAppDefaultKey).mockReturnValue(null);
      const result = await extractMemories([
        { role: 'user', content: '질문' },
        { role: 'assistant', content: '답변' },
      ]);
      expect(result).toEqual([]);
      expect(mockComplete).not.toHaveBeenCalled();
    });
  });

  describe('정상 추출', () => {
    it('AI가 유효한 JSON을 반환하면 메모리 배열을 파싱하여 반환한다', async () => {
      mockComplete.mockResolvedValue({
        content: JSON.stringify({
          memories: [
            { type: 'concept', content: '미분의 정의', importance: 0.9 },
            { type: 'key_term', content: '극한(limit)', importance: 0.7 },
          ],
        }),
      });

      const result = await extractMemories([
        { role: 'user', content: '미분의 정의가 뭐야?' },
        { role: 'assistant', content: '미분은 함수의 순간 변화율입니다.' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: 'concept', content: '미분의 정의', importance: 0.9 });
      expect(result[1].type).toBe('key_term');
    });

    it('AI 응답이 코드블록으로 감싸여 있어도 정상적으로 파싱한다', async () => {
      mockComplete.mockResolvedValue({
        content: '```json\n{"memories": [{"type": "summary", "content": "요약", "importance": 0.5}]}\n```',
      });

      const result = await extractMemories([
        { role: 'user', content: '오늘 뭐 배웠어?' },
        { role: 'assistant', content: '미분을 배웠습니다.' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('summary');
    });

    it('학습과 무관한 대화에서 AI가 빈 배열을 반환하면 빈 배열을 반환한다', async () => {
      mockComplete.mockResolvedValue({ content: '{"memories": []}' });

      const result = await extractMemories([
        { role: 'user', content: '오늘 날씨 어때?' },
        { role: 'assistant', content: '맑습니다.' },
      ]);

      expect(result).toEqual([]);
    });
  });

  describe('오류 처리', () => {
    it('AI가 유효하지 않은 JSON을 반환하면 빈 배열을 반환한다', async () => {
      mockComplete.mockResolvedValue({ content: 'not valid json at all' });

      const result = await extractMemories([
        { role: 'user', content: '질문' },
        { role: 'assistant', content: '답변' },
      ]);

      expect(result).toEqual([]);
    });

    it('AI가 스키마에 맞지 않는 JSON을 반환하면 빈 배열을 반환한다', async () => {
      mockComplete.mockResolvedValue({
        content: '{"memories": [{"type": "invalid_type", "content": "...", "importance": 0.5}]}',
      });

      const result = await extractMemories([
        { role: 'user', content: '질문' },
        { role: 'assistant', content: '답변' },
      ]);

      expect(result).toEqual([]);
    });
  });

  describe('메시지 포맷', () => {
    it('user 역할은 학생으로, assistant 역할은 AI로 변환되어 프롬프트에 전달된다', async () => {
      mockComplete.mockResolvedValue({ content: '{"memories": []}' });

      await extractMemories([
        { role: 'user', content: '미분 설명해줘' },
        { role: 'assistant', content: '미분은...' },
      ]);

      const callArg = mockComplete.mock.calls[0][0];
      expect(callArg.userPrompt).toContain('학생: 미분 설명해줘');
      expect(callArg.userPrompt).toContain('AI: 미분은...');
    });
  });
});
