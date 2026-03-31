import { encode } from 'gpt-tokenizer';

export interface Chunk {
  content: string;
  chunkIndex: number;
  pageNumber?: number;
}

const DEFAULT_CHUNK_SIZE = 500;   // 토큰
const DEFAULT_OVERLAP = 50;       // 토큰

/**
 * 텍스트를 토큰 기준으로 청킹
 * - 문단 경계를 존중하면서 분할
 * - 오버랩으로 맥락 유지
 */
export function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): Chunk[] {
  // 빈 텍스트
  const cleaned = text.replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return [];

  // 문단 단위로 분리
  const paragraphs = cleaned.split(/\n\n+/);
  const chunks: Chunk[] = [];

  let currentTokens: number[] = [];
  let currentTexts: string[] = [];
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const paraTokens = encode(para);

    // 단일 문단이 chunkSize보다 큰 경우 → 문장 단위 분할
    if (paraTokens.length > chunkSize) {
      // 현재 버퍼가 있으면 먼저 flush
      if (currentTexts.length > 0) {
        chunks.push({
          content: currentTexts.join('\n\n'),
          chunkIndex: chunkIndex++,
        });
        // 오버랩: 마지막 텍스트 유지
        const overlapText = currentTexts[currentTexts.length - 1];
        const overlapTokens = encode(overlapText);
        if (overlapTokens.length <= overlap) {
          currentTexts = [overlapText];
          currentTokens = overlapTokens;
        } else {
          currentTexts = [];
          currentTokens = [];
        }
      }

      // 큰 문단을 문장으로 분할
      const sentences = para.split(/(?<=[.!?。])\s+/);
      for (const sentence of sentences) {
        const sentTokens = encode(sentence);
        if (currentTokens.length + sentTokens.length > chunkSize && currentTexts.length > 0) {
          chunks.push({
            content: currentTexts.join(' '),
            chunkIndex: chunkIndex++,
          });
          // 오버랩
          currentTexts = currentTexts.slice(-1);
          currentTokens = currentTexts.length > 0 ? encode(currentTexts[0]) : [];
        }
        currentTexts.push(sentence);
        currentTokens = encode(currentTexts.join(' '));
      }
      continue;
    }

    // 일반 문단 추가
    if (currentTokens.length + paraTokens.length > chunkSize && currentTexts.length > 0) {
      chunks.push({
        content: currentTexts.join('\n\n'),
        chunkIndex: chunkIndex++,
      });
      // 오버랩: 마지막 문단 유지
      const overlapText = currentTexts[currentTexts.length - 1];
      const overlapTokens = encode(overlapText);
      if (overlapTokens.length <= overlap) {
        currentTexts = [overlapText];
        currentTokens = overlapTokens;
      } else {
        currentTexts = [];
        currentTokens = [];
      }
    }

    currentTexts.push(para);
    currentTokens = encode(currentTexts.join('\n\n'));
  }

  // 남은 버퍼 flush
  if (currentTexts.length > 0) {
    chunks.push({
      content: currentTexts.join('\n\n'),
      chunkIndex: chunkIndex++,
    });
  }

  return chunks;
}
