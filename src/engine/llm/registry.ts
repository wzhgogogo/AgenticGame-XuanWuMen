import type { LLMProvider } from "./types";
import type { LLMConfig } from "../../types";

type ProviderFactory = (config: LLMConfig) => LLMProvider;

const registry = new Map<string, ProviderFactory>();

/** 注册一个 LLM 适配器 */
export function registerProvider(name: string, factory: ProviderFactory): void {
  registry.set(name, factory);
}

/** 根据配置创建 provider 实例 */
export function createLLMProvider(config: LLMConfig): LLMProvider {
  const factory = registry.get(config.provider);
  if (!factory) {
    const available = Array.from(registry.keys()).join(", ");
    throw new Error(
      `Unknown LLM provider: "${config.provider}". Available: ${available}`
    );
  }
  return factory(config);
}

/** 获取所有已注册的 provider 名称 */
export function getRegisteredProviders(): string[] {
  return Array.from(registry.keys());
}
