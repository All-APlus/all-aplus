import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIRequest, AIResponse } from '../types';
import { withRetry } from '../retry';

export class ClaudeProvider implements AIProvider {
  name = 'claude';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    return withRetry(() => this.doComplete(request));
  }

  async *stream(request: AIRequest): AsyncIterable<string> {
    const stream = this.client.messages.stream({
      model: request.model ?? 'claude-sonnet-4-20250514',
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.userPrompt }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  private async doComplete(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await this.client.messages.create({
        model: request.model ?? 'claude-sonnet-4-20250514',
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw Object.assign(new Error('No text content in response'), { code: 'AI_ERROR' });
      }

      return {
        content: textBlock.text,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
        model: response.model,
      };
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
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
