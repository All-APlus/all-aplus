import type { AIProvider, ProviderName } from './types';

export async function createProvider(
  providerName: ProviderName,
  apiKey: string,
): Promise<AIProvider> {
  // GMS 키이면 GMS 전용 프로바이더 사용
  if (providerName === 'gemini' && apiKey.startsWith('S14')) {
    const { GmsGeminiProvider } = await import('./providers/gms-gemini');
    return new GmsGeminiProvider(apiKey);
  }

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
  // GMS 키가 있으면 Gemini에서 우선 사용
  if (providerName === 'gemini') {
    const gmsKey = process.env.GMS_KEY;
    if (gmsKey) return gmsKey;
  }

  switch (providerName) {
    case 'claude':
      return process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'gemini':
      return process.env.GEMINI_API_KEY;
  }
}
