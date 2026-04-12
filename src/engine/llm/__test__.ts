/**
 * LLM 层手动验证脚本
 *
 * 使用方法：
 * 1. 确保 .env 中配置了 VITE_LLM_PROVIDER / VITE_LLM_API_KEY / VITE_LLM_MODEL
 * 2. 在 App.tsx 中临时导入并调用 testLLM()
 * 3. 打开浏览器控制台查看输出
 * 4. 验证完毕后删除 App.tsx 中的调用
 */
import { createLLMProvider, getRegisteredProviders } from "./index";
import type { LLMMessage } from "./types";

export async function testLLM() {
  console.log("=== LLM Test ===");
  console.log("已注册的 providers:", getRegisteredProviders());

  const config = {
    provider: import.meta.env.VITE_LLM_PROVIDER || "anthropic",
    apiKey: import.meta.env.VITE_LLM_API_KEY || "",
    model: import.meta.env.VITE_LLM_MODEL || "claude-sonnet-4-20250514",
    baseUrl: import.meta.env.VITE_LLM_BASE_URL || undefined,
  };

  console.log("当前配置:", { provider: config.provider, model: config.model });

  if (!config.apiKey) {
    console.error("请在 .env 中配置 VITE_LLM_API_KEY");
    return;
  }

  const provider = createLLMProvider(config);

  const messages: LLMMessage[] = [
    { role: "system", content: "你是一个唐朝的谋士，说话简短有古风。用两三句话回答。" },
    { role: "user", content: "今日局势如何？" },
  ];

  try {
    console.log("发送请求...");
    let chunkCount = 0;
    const response = await provider.chat(messages, (chunk) => {
      chunkCount++;
      if (chunkCount <= 5) console.log(`  [chunk ${chunkCount}]`, JSON.stringify(chunk));
    });
    console.log(`流式输出完成，共 ${chunkCount} 个 chunks`);
    console.log("=== 完整回复 ===");
    console.log(response.content);
    console.log("测试通过");
  } catch (err) {
    console.error("测试失败:", err);
  }
}
