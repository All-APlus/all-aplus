import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, AIRequest, AIResponse } from '../types';
import { withRetry } from '../retry';

const GMS_BASE_URL = 'https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com';

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI;
  private baseUrl?: string;

  constructor(apiKey: string, options?: { baseUrl?: string }) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.baseUrl = options?.baseUrl;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    return withRetry(() => this.doComplete(request));
  }

  async *stream(request: AIRequest): AsyncIterable<string> {
    const genModel = this.client.getGenerativeModel(
      {
        model: request.model ?? 'gemini-2.5-flash',
        systemInstruction: request.systemPrompt,
      },
      this.baseUrl ? { baseUrl: this.baseUrl } : undefined,
    );

    const result = await genModel.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0,
      },
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }

  private async doComplete(request: AIRequest): Promise<AIResponse> {
    try {
      const genModel = this.client.getGenerativeModel(
        {
          model: request.model ?? 'gemini-2.5-flash',
          systemInstruction: request.systemPrompt,
        },
        this.baseUrl ? { baseUrl: this.baseUrl } : undefined,
      );

      const result = await genModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: request.userPrompt }] }],
        generationConfig: {
          maxOutputTokens: request.maxTokens ?? 4096,
          temperature: request.temperature ?? 0,
        },
      });

      const response = result.response;
      const content = response.text();
      if (!content) {
        throw Object.assign(new Error('No text content in response'), { code: 'AI_ERROR' });
      }

      return {
        content,
        tokensUsed: {
          input: response.usageMetadata?.promptTokenCount ?? 0,
          output: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
        model: request.model ?? 'gemini-2.5-flash',
      };
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message;
        if (msg.includes('fetch') || msg.includes('ECONNREFUSED') ||
            msg.includes('ETIMEDOUT') || msg.includes('network')) {
          throw Object.assign(new Error(`Network error: ${msg}`),
            { code: 'NETWORK_ERROR' });
        }
        if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
          throw Object.assign(new Error(`Rate limit: ${msg}`),
            { code: 'RATE_LIMIT_ERROR', status: 429 });
        }
        if (msg.includes('401') || msg.includes('API key') || msg.includes('authentication')) {
          throw Object.assign(new Error(`Auth failed: ${msg}`),
            { code: 'AUTH_ERROR' });
        }
        if (!('code' in error)) {
          throw Object.assign(new Error(`API error: ${msg}`),
            { code: 'AI_ERROR' });
        }
      }
      throw error;
    }
  }
}
