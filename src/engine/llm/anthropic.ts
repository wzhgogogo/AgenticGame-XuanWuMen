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

  async chat(messages: LLMMessage[], onChunk?: (text: string) => void, signal?: AbortSignal): Promise<LLMResponse> {
    // Anthropic 要求 system 单独传，从 messages 中提取
    // 同时处理 cacheBoundary：把前缀打包为一个 text block 并标 cache_control
    const systemMessages: LLMMessage[] = [];
    const chatMessages: Array<{ role: string; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemMessages.push(msg);
      } else {
        chatMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // 找到最后一个带 cacheBoundary 的 system message 索引
    let lastBoundary = -1;
    for (let i = 0; i < systemMessages.length; i++) {
      if (systemMessages[i].cacheBoundary) lastBoundary = i;
    }

    // system 字段：有 boundary 时用 block 数组，否则用字符串
    let systemField: unknown;
    if (systemMessages.length === 0) {
      systemField = undefined;
    } else if (lastBoundary < 0) {
      systemField = systemMessages.map((m) => m.content).join("\n\n");
    } else {
      const cachedText = systemMessages.slice(0, lastBoundary + 1).map((m) => m.content).join("\n\n");
      const tailText = systemMessages.slice(lastBoundary + 1).map((m) => m.content).join("\n\n");
      const blocks: Array<Record<string, unknown>> = [
        { type: "text", text: cachedText, cache_control: { type: "ephemeral" } },
      ];
      if (tailText) blocks.push({ type: "text", text: tailText });
      systemField = blocks;
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
          ...(systemField !== undefined ? { system: systemField } : {}),
          messages: chatMessages,
        }),
        signal,
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
