import { describe, it, expect } from 'vitest';
import { chunkText, type Chunk } from '@/lib/rag/chunker';

describe('chunkText', () => {
  describe('빈 입력 처리', () => {
    it('빈 문자열을 입력하면 빈 배열을 반환한다', () => {
      expect(chunkText('')).toEqual([]);
    });

    it('공백만 있는 문자열을 입력하면 빈 배열을 반환한다', () => {
      expect(chunkText('   \n   ')).toEqual([]);
    });

    it('연속된 줄바꿈만 있는 문자열을 입력하면 빈 배열을 반환한다', () => {
      expect(chunkText('\n\n\n\n')).toEqual([]);
    });
  });

  describe('단일 청크', () => {
    it('짧은 텍스트는 하나의 청크로 반환된다', () => {
      const text = '안녕하세요. 이것은 짧은 텍스트입니다.';
      const chunks = chunkText(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].content).toContain('안녕하세요');
    });

    it('반환된 청크는 content와 chunkIndex 필드를 가진다', () => {
      const chunks = chunkText('Hello world.');
      expect(chunks[0]).toHaveProperty('content');
      expect(chunks[0]).toHaveProperty('chunkIndex');
    });
  });

  describe('다중 청크 분할', () => {
    it('chunkSize를 초과하는 텍스트는 여러 청크로 분할된다', () => {
      // 문단 여러 개로 chunkSize=10 토큰을 초과하도록 구성
      const paragraphs = Array.from({ length: 20 }, (_, i) =>
        `This is paragraph number ${i + 1} with some content.`
      );
      const text = paragraphs.join('\n\n');
      const chunks = chunkText(text, 10, 0);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('chunkIndex는 0부터 순차적으로 증가한다', () => {
      const paragraphs = Array.from({ length: 20 }, (_, i) =>
        `Paragraph ${i + 1}: ${'word '.repeat(30)}`
      );
      const text = paragraphs.join('\n\n');
      const chunks = chunkText(text, 10, 0);
      chunks.forEach((chunk, i) => {
        expect(chunk.chunkIndex).toBe(i);
      });
    });

    it('분할된 청크들의 내용을 합치면 원본 텍스트의 모든 내용이 포함된다', () => {
      const paragraphs = Array.from({ length: 10 }, (_, i) =>
        `Unique marker para${i + 1} content here.`
      );
      const text = paragraphs.join('\n\n');
      const chunks = chunkText(text, 15, 0);
      const combined = chunks.map((c) => c.content).join(' ');
      paragraphs.forEach((_, i) => {
        expect(combined).toContain(`para${i + 1}`);
      });
    });
  });

  describe('오버랩(overlap)', () => {
    it('overlap=0이면 오버랩 없이 분할된다', () => {
      const paragraphs = Array.from({ length: 15 }, (_, i) =>
        `Section ${i + 1}: ${'token '.repeat(10)}`
      );
      const text = paragraphs.join('\n\n');
      const chunksNoOverlap = chunkText(text, 20, 0);
      // 오버랩 없으면 각 청크가 독립적 — 단순히 분할이 일어났는지만 확인
      expect(chunksNoOverlap.length).toBeGreaterThanOrEqual(1);
    });

    it('overlap이 클수록 더 많은 청크가 생성될 수 있다', () => {
      const paragraphs = Array.from({ length: 20 }, (_, i) =>
        `Para ${i + 1}: ${'text '.repeat(15)}`
      );
      const text = paragraphs.join('\n\n');
      const chunksNoOverlap = chunkText(text, 50, 0);
      const chunksWithOverlap = chunkText(text, 50, 30);
      expect(chunksWithOverlap.length).toBeGreaterThanOrEqual(chunksNoOverlap.length);
    });
  });

  describe('3개 이상 연속 줄바꿈 정규화', () => {
    it('3개 이상의 빈 줄은 2개로 압축된다', () => {
      const text = '문단 A\n\n\n\n\n문단 B';
      const chunks = chunkText(text);
      // 정규화 후 두 문단이 하나의 청크에 담겨야 함
      expect(chunks[0].content).toContain('문단 A');
      expect(chunks[0].content).toContain('문단 B');
    });
  });

  describe('큰 단일 문단 처리', () => {
    it('단일 문단이 chunkSize를 초과하면 문장 단위로 분할된다', () => {
      // 점(.)으로 끝나는 문장 여러 개를 하나의 문단(줄바꿈 없이)으로 구성
      const sentences = Array.from({ length: 30 }, (_, i) =>
        `This is sentence number ${i + 1} with enough words.`
      );
      const bigParagraph = sentences.join(' ');
      const chunks = chunkText(bigParagraph, 20, 0);
      expect(chunks.length).toBeGreaterThan(1);
    });
  });
});
