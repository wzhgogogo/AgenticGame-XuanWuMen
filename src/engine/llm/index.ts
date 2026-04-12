import { registerProvider, createLLMProvider, getRegisteredProviders } from "./registry";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";

// ---- 注册内置适配器 ----

registerProvider("anthropic", (config) => new AnthropicProvider(config));
registerProvider("openai", (config) => new OpenAIProvider(config));

// 以下都是 OpenAI 兼容接口，复用 OpenAIProvider
registerProvider("deepseek", (config) => new OpenAIProvider({
  ...config,
  baseUrl: config.baseUrl || "https://api.deepseek.com",
}));
registerProvider("moonshot", (config) => new OpenAIProvider({
  ...config,
  baseUrl: config.baseUrl || "https://api.moonshot.cn/v1",
}));
registerProvider("qwen", (config) => new OpenAIProvider({
  ...config,
  baseUrl: config.baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1",
}));
registerProvider("zhipu", (config) => new OpenAIProvider({
  ...config,
  baseUrl: config.baseUrl || "https://open.bigmodel.cn/api/paas/v4",
}));

// ---- 导出 ----

export { createLLMProvider, registerProvider, getRegisteredProviders };
export type { LLMProvider, LLMMessage, LLMResponse, LLMError } from "./types";
