import type { AIProvider, ProviderName } from './types';

export async function createProvider(
  providerName: ProviderName,
  apiKey: string,
): Promise<AIProvider> {
  switch (providerName) {
    case 'claude': {
      const { ClaudeProvider } = await import('./providers/claude');
      return new ClaudeProvider(apiKey);
    }
    case 'openai': {
      const { OpenAIProvider } = await import('./providers/openai');
      return new OpenAIProvider(apiKey);
    }
    case 'gemini': {
      const { GeminiProvider } = await import('./providers/gemini');
      return new GeminiProvider(apiKey);
    }
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

export function getAppDefaultKey(providerName: ProviderName): string | undefined {
  switch (providerName) {
    case 'claude':
      return process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'gemini':
      return process.env.GEMINI_API_KEY;
  }
}
