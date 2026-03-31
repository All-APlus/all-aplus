import OpenAI from 'openai';
import { AIProvider, AIRequest, AIResponse } from '../types';
import { withRetry } from '../retry';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    return withRetry(() => this.doComplete(request));
  }

  async *stream(request: AIRequest): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: request.model ?? 'gpt-4o',
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0,
      stream: true,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  private async doComplete(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: request.model ?? 'gpt-4o',
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw Object.assign(new Error('No text content in response'), { code: 'AI_ERROR' });
      }

      return {
        content,
        tokensUsed: {
          input: response.usage?.prompt_tokens ?? 0,
          output: response.usage?.completion_tokens ?? 0,
        },
        model: response.model,
      };
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          throw Object.assign(new Error(`Rate limit: ${error.message}`),
            { code: 'RATE_LIMIT_ERROR', status: 429 });
        }
        if (error.status === 401) {
          throw Object.assign(new Error(`Auth failed: ${error.message}`),
            { code: 'AUTH_ERROR' });
        }
        throw Object.assign(new Error(`API error: ${error.message}`),
          { code: 'AI_ERROR', status: error.status });
      }
      this.rethrowNetworkError(error);
      throw error;
    }
  }

  private rethrowNetworkError(error: unknown): void {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg.includes('fetch') || msg.includes('ECONNREFUSED') ||
          msg.includes('ETIMEDOUT') || msg.includes('network')) {
        throw Object.assign(new Error(`Network error: ${msg}`),
          { code: 'NETWORK_ERROR' });
      }
    }
  }
}
