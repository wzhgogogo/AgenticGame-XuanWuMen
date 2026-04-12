export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
}

export interface LLMProvider {
  chat(
    messages: LLMMessage[],
    onChunk?: (text: string) => void
  ): Promise<LLMResponse>;
}

export interface LLMError {
  code: string;
  message: string;
}
