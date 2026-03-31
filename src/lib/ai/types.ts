export interface AIProvider {
  name: string;
  complete(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<string>;
}

export interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  tokensUsed: { input: number; output: number };
  model: string;
}

export interface StreamChunk {
  type: 'chunk' | 'sources' | 'done';
  content?: string;
  sources?: SourceReference[];
  messageId?: string;
  tokensUsed?: { input: number; output: number };
}

export interface SourceReference {
  id: string;
  contentPreview: string;
  sourceFile: string;
  page?: number;
}

export type ProviderName = 'claude' | 'openai' | 'gemini';
