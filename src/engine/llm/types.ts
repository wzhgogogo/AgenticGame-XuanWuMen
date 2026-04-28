export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
  /**
   * 若为 true，表示本条消息是可缓存前缀的终点。
   * - Anthropic：该位置会注入 cache_control: { type: 'ephemeral' }
   * - OpenAI/DeepSeek 等自动前缀缓存的 provider：忽略此字段（保持前缀稳定即自动命中）
   */
  cacheBoundary?: boolean;
}

export interface LLMResponse {
  content: string;
}

export interface LLMProvider {
  chat(
    messages: LLMMessage[],
    onChunk?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<LLMResponse>;
}

export interface LLMError {
  code: string;
  message: string;
}
