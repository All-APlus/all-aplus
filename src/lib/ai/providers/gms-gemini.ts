import { AIProvider, AIRequest, AIResponse } from '../types';

const GMS_BASE = 'https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com/v1beta';

export class GmsGeminiProvider implements AIProvider {
  name = 'gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = 'gemini-2.0-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const url = `${GMS_BASE}/models/${this.model}:generateContent`;

    const body = {
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GMS API error (${res.status}): ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content in GMS response');
    }

    return {
      content,
      tokensUsed: {
        input: data.usageMetadata?.promptTokenCount ?? 0,
        output: data.usageMetadata?.candidatesTokenCount ?? 0,
      },
      model: this.model,
    };
  }

  async *stream(request: AIRequest): AsyncIterable<string> {
    // GMS는 non-streaming으로 처리 후 한번에 yield
    const result = await this.complete(request);
    yield result.content;
  }
}
