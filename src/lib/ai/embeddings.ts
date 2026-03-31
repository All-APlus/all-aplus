const GMS_OPENAI_BASE = 'https://gms.ssafy.io/gmsapi/api.openai.com/v1';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_BATCH_SIZE = 100;

interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  usage: { prompt_tokens: number; total_tokens: number };
}

function getGmsKey(): string {
  const key = process.env.GMS_KEY;
  if (!key) throw new Error('GMS_KEY 환경변수가 설정되지 않았습니다');
  return key;
}

/** 단일 텍스트 임베딩 */
export async function embed(text: string): Promise<number[]> {
  const result = await embedBatch([text]);
  return result[0];
}

/** 배치 임베딩 (최대 100개씩 분할) */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const res = await fetch(`${GMS_OPENAI_BASE}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getGmsKey()}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: batch,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Embedding API error (${res.status}): ${errText.substring(0, 200)}`);
    }

    const data: EmbeddingResponse = await res.json();
    const sorted = data.data.sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sorted.map((d) => d.embedding));
  }

  return allEmbeddings;
}
