/**
 * LLM 调用的统一重试封装。
 *
 * 功能：
 * - 指数退避（backoffBase * 2^attempt，clamp 到 backoffMax）
 * - 只对可重试错误重试（网络、超时、429、5xx、validator 失败）
 * - 不重试：AbortError、4xx（非 429）
 * - 可选 validator：响应内容不合规时作为失败触发重试
 *
 * 暂未接入 provider shuffle（单 provider 足够），后续需要时在此扩展。
 */

import type { LLMMessage, LLMProvider, LLMResponse } from './types';
import { debugLog } from '../debugLog';

export interface ValidatorResult {
  ok: boolean;
  reason?: string;
}

export interface RetryOptions {
  /** 最大尝试次数（含首次），默认 3 */
  maxRetries?: number;
  /** 退避基数，默认 1000ms */
  backoffBaseMs?: number;
  /** 退避上限，默认 30000ms */
  backoffMaxMs?: number;
  /** 取消信号 */
  signal?: AbortSignal;
  /** 流式 chunk 回调 */
  onChunk?: (text: string) => void;
  /** 响应内容校验器，返回 ok=false 时触发重试 */
  validator?: (content: string) => ValidatorResult;
  /** 调试标签 */
  label?: string;
}

export class LLMValidationError extends Error {
  reason: string;
  content: string;
  constructor(reason: string, content: string) {
    super(`LLM output validation failed: ${reason}`);
    this.name = 'LLMValidationError';
    this.reason = reason;
    this.content = content;
  }
}

/**
 * 判断错误是否可重试。AbortError / 非 429 的 4xx 视作不可重试。
 * provider 抛错形式多样（fetch / anthropic sdk / openai sdk），做多路嗅探。
 */
function isRetryableError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; status?: number; code?: string | number; message?: string };

  if (e.name === 'AbortError') return false;

  // HTTP status
  const status = typeof e.status === 'number' ? e.status : undefined;
  if (status !== undefined) {
    if (status === 429) return true;              // rate limit
    if (status >= 500 && status < 600) return true; // 5xx
    if (status >= 400 && status < 500) return false; // 其他 4xx
  }

  // 网络类错误
  const msg = (e.message || '').toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) return true;
  if (msg.includes('network') || msg.includes('fetch failed') || msg.includes('econnreset')) return true;
  if (msg.includes('socket hang up') || msg.includes('enotfound')) return true;

  // 兜底保守：无 status 且无明确网络关键字的错误默认可重试一次
  return status === undefined;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function callLLMWithRetry(
  provider: LLMProvider,
  messages: LLMMessage[],
  options: RetryOptions = {},
): Promise<LLMResponse> {
  const {
    maxRetries = 3,
    backoffBaseMs = 1000,
    backoffMaxMs = 30000,
    signal,
    onChunk,
    validator,
    label = 'llm',
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      const response = await provider.chat(messages, onChunk, signal);

      // 校验通过则直接返回
      if (!validator) return response;
      const result = validator(response.content);
      if (result.ok) return response;

      // validator 失败：把它当作可重试错误
      lastError = new LLMValidationError(result.reason ?? 'validator rejected', response.content);
      debugLog('llm_call', `[${label}] validator 拒绝 (attempt ${attempt + 1}/${maxRetries})`, result.reason || '');
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err)) {
        throw err;
      }
      debugLog('llm_call', `[${label}] 失败将重试 (attempt ${attempt + 1}/${maxRetries})`, String(err instanceof Error ? err.message : err));
    }

    // 未到最后一次 → 退避后重试
    if (attempt < maxRetries - 1) {
      const wait = Math.min(backoffBaseMs * 2 ** attempt, backoffMaxMs);
      await sleep(wait, signal);
    }
  }

  // 耗尽重试次数
  throw lastError ?? new Error(`callLLMWithRetry[${label}] exhausted without error`);
}
