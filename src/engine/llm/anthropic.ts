import type { LLMMessage, LLMResponse, LLMProvider, LLMError } from "./types";
import type { LLMConfig } from "../../types";
import { readSSEStream } from "./sseParser";

export class AnthropicProvider implements LLMProvider {
  apiKey: string;
  model: string;
  maxTokens: number;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.maxTokens = config.maxTokens || 4096;
  }

  async chat(messages: LLMMessage[], onChunk?: (text: string) => void): Promise<LLMResponse> {
    // Anthropic 要求 system 单独传，从 messages 中提取
    const systemParts: string[] = [];
    const chatMessages: Array<{ role: string; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemParts.push(msg.content);
      } else {
        chatMessages.push({ role: msg.role, content: msg.content });
      }
    }

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          stream: true,
          ...(systemParts.length > 0 ? { system: systemParts.join("\n\n") } : {}),
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
      throw { code: "anthropic_error", message: errorMsg } as LLMError;
    }

    if (!response.body) {
      throw { code: "anthropic_error", message: "Response body is null" } as LLMError;
    }

    let fullContent = "";

    await readSSEStream(response.body, (data) => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          fullContent += parsed.delta.text;
          onChunk?.(parsed.delta.text);
        }
      } catch { /* ignore non-JSON lines */ }
    });

    return { content: fullContent };
  }
}
