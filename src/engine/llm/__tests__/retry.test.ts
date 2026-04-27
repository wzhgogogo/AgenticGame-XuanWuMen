import { describe, it, expect, vi } from 'vitest';
import { callLLMWithRetry, LLMValidationError } from '../retry';
import type { LLMProvider, LLMMessage } from '../types';

function makeProvider(
  handlers: Array<((messages: LLMMessage[]) => Promise<{ content: string }> | Error)>,
): LLMProvider {
  let i = 0;
  return {
    chat: async (messages) => {
      const h = handlers[Math.min(i, handlers.length - 1)];
      i++;
      const result = typeof h === 'function' ? h(messages) : h;
      if (result instanceof Promise) return result;
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

describe('callLLMWithRetry', () => {
  it('returns on first success', async () => {
    const provider = makeProvider([async () => ({ content: 'ok' })]);
    const res = await callLLMWithRetry(provider, [{ role: 'user', content: 'hi' }]);
    expect(res.content).toBe('ok');
  });

  it('retries on network error and eventually succeeds', async () => {
    const provider = makeProvider([
      async () => { throw new Error('fetch failed'); },
      async () => { throw new Error('timeout occurred'); },
      async () => ({ content: 'ok after retries' }),
    ]);
    const res = await callLLMWithRetry(provider, [{ role: 'user', content: 'hi' }], {
      maxRetries: 3,
      backoffBaseMs: 1,
      backoffMaxMs: 5,
    });
    expect(res.content).toBe('ok after retries');
  });

  it('does not retry on 400-class errors (non-429)', async () => {
    const err: Error & { status?: number } = new Error('bad request');
    err.status = 400;
    const chatSpy = vi.fn(async () => { throw err; });
    const provider: LLMProvider = { chat: chatSpy };
    await expect(
      callLLMWithRetry(provider, [{ role: 'user', content: 'x' }], { maxRetries: 3, backoffBaseMs: 1 }),
    ).rejects.toThrow('bad request');
    expect(chatSpy).toHaveBeenCalledTimes(1);
  });

  it('retries on 429', async () => {
    const err429: Error & { status?: number } = new Error('rate limited');
    err429.status = 429;
    let call = 0;
    const provider: LLMProvider = {
      chat: async () => {
        call++;
        if (call < 3) throw err429;
        return { content: 'ok' };
      },
    };
    const res = await callLLMWithRetry(provider, [{ role: 'user', content: 'x' }], {
      maxRetries: 3, backoffBaseMs: 1, backoffMaxMs: 5,
    });
    expect(res.content).toBe('ok');
    expect(call).toBe(3);
  });

  it('retries on 5xx', async () => {
    const err500: Error & { status?: number } = new Error('server down');
    err500.status = 503;
    let call = 0;
    const provider: LLMProvider = {
      chat: async () => {
        call++;
        if (call < 2) throw err500;
        return { content: 'ok' };
      },
    };
    const res = await callLLMWithRetry(provider, [{ role: 'user', content: 'x' }], {
      maxRetries: 3, backoffBaseMs: 1, backoffMaxMs: 5,
    });
    expect(res.content).toBe('ok');
  });

  it('does not retry on AbortError', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError');
    const chatSpy = vi.fn(async () => { throw abortErr; });
    const provider: LLMProvider = { chat: chatSpy };
    await expect(
      callLLMWithRetry(provider, [{ role: 'user', content: 'x' }], { maxRetries: 3, backoffBaseMs: 1 }),
    ).rejects.toThrow();
    expect(chatSpy).toHaveBeenCalledTimes(1);
  });

  it('validator failure triggers retry', async () => {
    let call = 0;
    const provider: LLMProvider = {
      chat: async () => {
        call++;
        return { content: call < 3 ? 'bad' : 'good' };
      },
    };
    const res = await callLLMWithRetry(provider, [{ role: 'user', content: 'x' }], {
      maxRetries: 3,
      backoffBaseMs: 1,
      backoffMaxMs: 5,
      validator: (c) => c === 'good' ? { ok: true } : { ok: false, reason: 'not good' },
    });
    expect(res.content).toBe('good');
    expect(call).toBe(3);
  });

  it('validator failure after exhausted retries throws LLMValidationError', async () => {
    const provider: LLMProvider = { chat: async () => ({ content: 'always bad' }) };
    await expect(
      callLLMWithRetry(provider, [{ role: 'user', content: 'x' }], {
        maxRetries: 2,
        backoffBaseMs: 1,
        backoffMaxMs: 5,
        validator: () => ({ ok: false, reason: 'nope' }),
      }),
    ).rejects.toBeInstanceOf(LLMValidationError);
  });

  it('respects abort signal during backoff', async () => {
    const provider: LLMProvider = {
      chat: async () => { throw new Error('fetch failed'); },
    };
    const controller = new AbortController();
    const promise = callLLMWithRetry(provider, [{ role: 'user', content: 'x' }], {
      maxRetries: 5,
      backoffBaseMs: 1000,
      signal: controller.signal,
    });
    // 第一次请求会立即失败，然后进入 sleep(1000)；在此期间 abort
    setTimeout(() => controller.abort(), 20);
    await expect(promise).rejects.toThrow();
  });
});
