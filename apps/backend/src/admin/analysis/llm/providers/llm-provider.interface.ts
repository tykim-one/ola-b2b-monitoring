/**
 * LLM Provider Interface
 *
 * Defines the contract for all LLM providers (Gemini, OpenAI, Anthropic, etc.)
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  latencyMs: number;
}

export interface LLMProvider {
  name: string;
  generateResponse(messages: Message[], context?: string): Promise<LLMResponse>;
  isConfigured(): boolean;
}
