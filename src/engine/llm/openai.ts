import type { LLMMessage, LLMResponse, LLMProvider, LLMError } from "./types";
import type { LLMConfig } from "../../types";
import { readSSEStream } from "./sseParser";

export class OpenAIProvider implements LLMProvider {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.maxTokens = config.maxTokens || 4096;
    // 去掉末尾斜杠
    this.baseUrl = (config.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  }

  async chat(messages: LLMMessage[], onChunk?: (text: string) => void): Promise<LLMResponse> {
    // OpenAI 格式直接传 messages（包含 system）
    const chatMessages = messages.map((m) => ({ role: m.role, content: m.content }));

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          stream: true,
          messages: chatMessages,
        }),
      });
    } catch (err) {
      throw { code: "network_error", message: String(err) } as LLMError;
    }

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        errorMsg = body.error?.message || errorMsg;
      } catch { /* ignore parse error */ }
      throw { code: "openai_error", message: errorMsg } as LLMError;
    }

    if (!response.body) {
      throw { code: "openai_error", message: "Response body is null" } as LLMError;
    }

    let fullContent = "";

    await readSSEStream(response.body, (data) => {
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const text = parsed.choices?.[0]?.delta?.content;
        if (text) {
          fullContent += text;
          onChunk?.(text);
        }
      } catch { /* ignore non-JSON lines */ }
    });

    return { content: fullContent };
  }
}
